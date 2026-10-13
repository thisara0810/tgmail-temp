import { describe, it, expect, beforeEach } from 'vitest';
import { generateRandomLocalPart, isValidLocalPart } from '../src/utils/addressGenerator.js';
import { detectVerificationCode, detectVerificationLinks, sanitizeEmailHtml } from '../src/utils/emailParser.js';
import { MemoryStorageService } from '../src/services/storage.js';
import { AddressRecord, MessageRecord } from '../src/types/index.js';

describe('Address Generator Logic', () => {
  it('should generate valid addresses meeting strict criteria', () => {
    for (let i = 0; i < 100; i++) {
      const localPart = generateRandomLocalPart();

      // Check regex: 12-14 chars, lowercase letters and numbers only
      expect(localPart).toMatch(/^[a-z0-9]{12,14}$/);
      expect(localPart.length).toBeGreaterThanOrEqual(12);
      expect(localPart.length).toBeLessThanOrEqual(14);

      // Must contain at least one letter and at least one digit
      expect(/[a-z]/.test(localPart)).toBe(true);
      expect(/[0-9]/.test(localPart)).toBe(true);

      // No special characters
      expect(/[-_.,!@#$%^&*()]/.test(localPart)).toBe(false);

      // Validation helper check
      expect(isValidLocalPart(localPart)).toBe(true);
    }
  });

  it('should reject invalid local parts', () => {
    expect(isValidLocalPart('short123')).toBe(false); // too short (<12)
    expect(isValidLocalPart('toolongstring123456789')).toBe(false); // too long (>14)
    expect(isValidLocalPart('alllettersonlyhere')).toBe(false); // no digits
    expect(isValidLocalPart('12345678901234')).toBe(false); // no letters
    expect(isValidLocalPart('invalid-hyphen12')).toBe(false); // contains hyphen
    expect(isValidLocalPart('invalid_under12')).toBe(false); // contains underscore
    expect(isValidLocalPart('invalid.dot1234')).toBe(false); // contains dot
    expect(isValidLocalPart('UPPERCASE12345')).toBe(false); // uppercase
  });
});

describe('Code and Link Detection', () => {
  it('should detect 6-digit verification OTP codes', () => {
    const text = 'Your verification code is 482910. Do not share this with anyone.';
    const code = detectVerificationCode(text);
    expect(code).toBe('482910');
  });

  it('should detect labeled alphanumeric verification codes', () => {
    const text = 'Use your security code: G8B9X to confirm login.';
    const code = detectVerificationCode(text);
    expect(code).toBe('G8B9X');
  });

  it('should not match normal years as OTP codes', () => {
    const text = 'Welcome to the platform established in 2024. Your code is 859321.';
    const code = detectVerificationCode(text);
    expect(code).toBe('859321');
  });

  it('should extract verification and confirmation URLs', () => {
    const text = 'Click here: https://example.com/auth/verify?token=xyz123 to activate your account.';
    const links = detectVerificationLinks(text);
    expect(links.length).toBe(1);
    expect(links[0]).toBe('https://example.com/auth/verify?token=xyz123');
  });
});

describe('HTML Sanitization', () => {
  it('should strip scripts, iframes, and javascript links', () => {
    const dirty = `
      <div>
        <h1>Welcome</h1>
        <script>alert('xss')</script>
        <iframe src="https://evil.com"></iframe>
        <a href="javascript:alert(1)">Click me</a>
        <p>Safe text</p>
      </div>
    `;
    const clean = sanitizeEmailHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('<iframe>');
    expect(clean).not.toContain('javascript:alert(1)');
    expect(clean).toContain('<h1>Welcome</h1>');
    expect(clean).toContain('<p>Safe text</p>');
  });

  it('should block remote tracking images by default', () => {
    const dirty = '<img src="https://tracker.com/pixel.png" alt="tracker" />';
    const clean = sanitizeEmailHtml(dirty);
    expect(clean).toContain('data-original-src="https://tracker.com/pixel.png"');
    expect(clean).toContain('data-blocked="true"');
  });
});

describe('Storage and Expiry Cleanup', () => {
  let storage: MemoryStorageService;

  beforeEach(() => {
    storage = new MemoryStorageService();
  });

  it('should save and retrieve address', async () => {
    const record: AddressRecord = {
      id: 'session-1',
      address: 'testuser12345@tgmail.com',
      localPart: 'testuser12345',
      createdAt: Date.now(),
      expiresAt: Date.now() + 1800000,
      extensionsCount: 0
    };
    await storage.saveAddress(record);

    const fetched = await storage.getAddress('session-1');
    expect(fetched).not.toBeNull();
    expect(fetched?.address).toBe('testuser12345@tgmail.com');
  });

  it('should extend address up to 2 times', async () => {
    const now = Date.now();
    const record: AddressRecord = {
      id: 'session-ext',
      address: 'extenduser123@tgmail.com',
      localPart: 'extenduser123',
      createdAt: now,
      expiresAt: now + 1800000,
      extensionsCount: 0
    };
    await storage.saveAddress(record);

    // Extension 1
    const ext1 = await storage.extendAddress('session-ext');
    expect(ext1?.extensionsCount).toBe(1);
    expect(ext1?.expiresAt).toBe(record.expiresAt + 600000);

    // Extension 2
    const ext2 = await storage.extendAddress('session-ext');
    expect(ext2?.extensionsCount).toBe(2);

    // Extension 3 should fail (max 2)
    const ext3 = await storage.extendAddress('session-ext');
    expect(ext3).toBeNull();
  });

  it('should cascade delete messages when address is cleaned or deleted', async () => {
    const record: AddressRecord = {
      id: 'session-del',
      address: 'cascade123456@tgmail.com',
      localPart: 'cascade123456',
      createdAt: Date.now() - 2000000, // already expired
      expiresAt: Date.now() - 1000,
      extensionsCount: 0
    };
    await storage.saveAddress(record);

    const msg: MessageRecord = {
      id: 'msg-1',
      address: 'cascade123456@tgmail.com',
      from: 'sender@example.com',
      to: 'cascade123456@tgmail.com',
      subject: 'Hello',
      text: 'Test message',
      html: '<p>Test</p>',
      sanitizedHtml: '<p>Test</p>',
      preview: 'Test',
      headers: {},
      attachments: [],
      detectedLinks: [],
      createdAt: Date.now()
    };
    await storage.saveMessage(msg);

    // Run cleanup
    const result = await storage.cleanExpired();
    expect(result.expiredAddresses).toBe(1);
    expect(result.deletedMessages).toBe(1);

    // Ensure message and address are gone
    const msgCheck = await storage.getMessageById('msg-1');
    expect(msgCheck).toBeNull();

    const addrCheck = await storage.getAddress('session-del');
    expect(addrCheck).toBeNull();
  });
});
