import { Response } from 'express';
import { MessageRecord } from '../types/index.js';

interface ClientConnection {
  sessionId: string;
  address: string;
  res: Response;
}

class SseManager {
  private clients = new Map<string, ClientConnection>();

  /**
   * Register a client response stream for SSE.
   */
  addClient(sessionId: string, address: string, res: Response): void {
    // If old connection exists for this session, close it cleanly
    const existing = this.clients.get(sessionId);
    if (existing) {
      try {
        existing.res.end();
      } catch {
        // ignore
      }
    }

    this.clients.set(sessionId, { sessionId, address: address.toLowerCase(), res });

    // Send initial ping to establish connection
    res.write(`data: ${JSON.stringify({ type: 'connected', address })}\n\n`);

    res.on('close', () => {
      this.removeClient(sessionId);
    });
  }

  removeClient(sessionId: string): void {
    this.clients.delete(sessionId);
  }

  /**
   * Broadcast newly arrived email to connected client for that address.
   */
  broadcastNewMessage(address: string, message: MessageRecord): void {
    const normalized = address.toLowerCase();
    for (const client of this.clients.values()) {
      if (client.address === normalized) {
        try {
          client.res.write(`event: new_message\n`);
          client.res.write(`data: ${JSON.stringify(message)}\n\n`);
        } catch (err) {
          console.error(`Failed to push SSE to session ${client.sessionId}:`, err);
        }
      }
    }
  }

  /**
   * Broadcast inbox cleared or address deleted event.
   */
  broadcastAddressExpired(address: string): void {
    const normalized = address.toLowerCase();
    for (const client of this.clients.values()) {
      if (client.address === normalized) {
        try {
          client.res.write(`event: address_expired\n`);
          client.res.write(`data: ${JSON.stringify({ address: normalized })}\n\n`);
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Keep connections alive through proxies / NAT with comment pings every 20s.
   */
  startHeartbeat(intervalMs: number = 20000): NodeJS.Timeout {
    return setInterval(() => {
      for (const client of this.clients.values()) {
        try {
          client.res.write(`: ping\n\n`);
        } catch {
          this.removeClient(client.sessionId);
        }
      }
    }, intervalMs);
  }
}

export const sseManager = new SseManager();
