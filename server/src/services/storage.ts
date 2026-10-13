import { AddressRecord, MessageRecord } from '../types/index.js';
import { config } from '../config.js';

export interface IStorageService {
  saveAddress(record: AddressRecord): Promise<void>;
  getAddress(sessionId: string): Promise<AddressRecord | null>;
  getAddressByEmail(address: string): Promise<AddressRecord | null>;
  extendAddress(sessionId: string): Promise<AddressRecord | null>;
  deleteAddress(sessionId: string): Promise<boolean>;
  deleteAddressByEmail(address: string): Promise<boolean>;
  
  saveMessage(message: MessageRecord): Promise<boolean>;
  getMessages(address: string): Promise<MessageRecord[]>;
  getMessageById(id: string): Promise<MessageRecord | null>;
  deleteMessage(id: string, address: string): Promise<boolean>;

  cleanExpired(): Promise<{ expiredAddresses: number; deletedMessages: number }>;
}

/**
 * High-performance In-Memory Storage engine with TTL indexing.
 * Perfect for zero-external-dependency setups and self-contained deployments,
 * with full interface compatibility for Redis/SQLite backends.
 */
export class MemoryStorageService implements IStorageService {
  private addressesBySession = new Map<string, AddressRecord>();
  private addressesByEmail = new Map<string, AddressRecord>();
  private messagesByAddress = new Map<string, MessageRecord[]>();
  private messagesById = new Map<string, MessageRecord>();

  async saveAddress(record: AddressRecord): Promise<void> {
    const normalizedEmail = record.address.toLowerCase();
    this.addressesBySession.set(record.id, record);
    this.addressesByEmail.set(normalizedEmail, record);
    if (!this.messagesByAddress.has(normalizedEmail)) {
      this.messagesByAddress.set(normalizedEmail, []);
    }
  }

  async getAddress(sessionId: string): Promise<AddressRecord | null> {
    const record = this.addressesBySession.get(sessionId);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      await this.deleteAddress(sessionId);
      return null;
    }
    return record;
  }

  async getAddressByEmail(address: string): Promise<AddressRecord | null> {
    const normalized = address.toLowerCase();
    const record = this.addressesByEmail.get(normalized);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      await this.deleteAddressByEmail(normalized);
      return null;
    }
    return record;
  }

  async extendAddress(sessionId: string): Promise<AddressRecord | null> {
    const record = await this.getAddress(sessionId);
    if (!record) return null;

    if (record.extensionsCount >= config.maxExtensions) {
      return null;
    }

    record.extensionsCount += 1;
    record.expiresAt += config.extensionSeconds * 1000;
    this.addressesBySession.set(sessionId, record);
    this.addressesByEmail.set(record.address.toLowerCase(), record);
    return record;
  }

  async deleteAddress(sessionId: string): Promise<boolean> {
    const record = this.addressesBySession.get(sessionId);
    if (!record) return false;

    const email = record.address.toLowerCase();
    this.addressesBySession.delete(sessionId);
    this.addressesByEmail.delete(email);

    // Cascade delete all messages and attachments
    const messages = this.messagesByAddress.get(email) || [];
    for (const msg of messages) {
      this.messagesById.delete(msg.id);
    }
    this.messagesByAddress.delete(email);
    return true;
  }

  async deleteAddressByEmail(address: string): Promise<boolean> {
    const normalized = address.toLowerCase();
    const record = this.addressesByEmail.get(normalized);
    if (!record) return false;
    return this.deleteAddress(record.id);
  }

  async saveMessage(message: MessageRecord): Promise<boolean> {
    const normalizedEmail = message.address.toLowerCase();
    const address = await this.getAddressByEmail(normalizedEmail);
    if (!address) return false; // Address does not exist or expired

    const msgs = this.messagesByAddress.get(normalizedEmail) || [];
    if (msgs.length >= config.maxMessagesPerAddress) {
      // Remove oldest message
      const oldest = msgs.shift();
      if (oldest) this.messagesById.delete(oldest.id);
    }

    msgs.push(message);
    this.messagesByAddress.set(normalizedEmail, msgs);
    this.messagesById.set(message.id, message);
    return true;
  }

  async getMessages(address: string): Promise<MessageRecord[]> {
    const normalized = address.toLowerCase();
    const addr = await this.getAddressByEmail(normalized);
    if (!addr) return [];

    const msgs = this.messagesByAddress.get(normalized) || [];
    // Return sorted newest first
    return [...msgs].sort((a, b) => b.createdAt - a.createdAt);
  }

  async getMessageById(id: string): Promise<MessageRecord | null> {
    const msg = this.messagesById.get(id);
    if (!msg) return null;

    // Verify address still alive
    const addr = await this.getAddressByEmail(msg.address);
    if (!addr) {
      this.messagesById.delete(id);
      return null;
    }
    return msg;
  }

  async deleteMessage(id: string, address: string): Promise<boolean> {
    const normalized = address.toLowerCase();
    const msg = this.messagesById.get(id);
    if (!msg || msg.address.toLowerCase() !== normalized) {
      return false;
    }

    this.messagesById.delete(id);
    const list = this.messagesByAddress.get(normalized) || [];
    this.messagesByAddress.set(
      normalized,
      list.filter((m) => m.id !== id)
    );
    return true;
  }

  async cleanExpired(): Promise<{ expiredAddresses: number; deletedMessages: number }> {
    const now = Date.now();
    let expiredAddresses = 0;
    let deletedMessages = 0;

    for (const [sessionId, record] of Array.from(this.addressesBySession.entries())) {
      if (now > record.expiresAt) {
        const email = record.address.toLowerCase();
        const msgs = this.messagesByAddress.get(email) || [];
        deletedMessages += msgs.length;

        for (const msg of msgs) {
          this.messagesById.delete(msg.id);
        }
        this.messagesByAddress.delete(email);
        this.addressesBySession.delete(sessionId);
        this.addressesByEmail.delete(email);
        expiredAddresses += 1;
      }
    }

    return { expiredAddresses, deletedMessages };
  }
}

export const storage = new MemoryStorageService();
