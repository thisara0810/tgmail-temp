import { SMTPServer } from 'smtp-server';
import { simpleParser, ParsedMail } from 'mailparser';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { storage } from './storage.js';
import { sseManager } from './sse.js';
import {
  detectVerificationCode,
  detectVerificationLinks,
  sanitizeEmailHtml
} from '../utils/emailParser.js';
import { MessageRecord, AttachmentRecord } from '../types/index.js';

export function createSmtpServer(): SMTPServer {
  const server = new SMTPServer({
    secure: false, // Inbound MTA on port 25 starts in plain text with STARTTLS support
    disabledCommands: ['AUTH'], // Receive-only server, no authentication needed
    size: config.maxMessageSize,
    banner: 'TGMail Temp Inbound Mail Transfer Agent',

    // Validate RCPT TO: ONLY accept active @tgmail.com addresses
    onRcptTo(address, session, callback) {
      const recipient = address.address.toLowerCase();
      const [localPart, domain] = recipient.split('@');

      if (!domain || domain !== config.domain) {
        // Reject messages addressed to other domains
        const err = new Error(`550 5.1.1 Relay access denied: We only accept mail for @${config.domain}`);
        (err as any).responseCode = 550;
        return callback(err);
      }

      // Check if address exists and is active (not expired)
      storage
        .getAddressByEmail(recipient)
        .then((record) => {
          if (!record) {
            const err = new Error(`550 5.1.1 Recipient address does not exist or has expired`);
            (err as any).responseCode = 550;
            return callback(err);
          }

          // Address exists and is currently active
          callback();
        })
        .catch((err) => {
          callback(new Error('451 4.3.0 Temporary lookup error'));
        });
    },

    // Process and parse inbound email stream
    onData(stream, session, callback) {
      if (stream.sizeExceeded) {
        const err = new Error('552 5.3.4 Message size exceeds 10MB limit');
        (err as any).responseCode = 552;
        return callback(err);
      }

      simpleParser(stream, async (err: Error | null, parsed: ParsedMail) => {
        if (err) {
          console.error('Mail parsing error:', err);
          return callback(new Error('451 4.3.0 Error parsing incoming message stream'));
        }

        try {
          const recipients = session.envelope.rcptTo.map((r) => r.address.toLowerCase());

          for (const recipient of recipients) {
            // Check if destination address is active
            const activeAddr = await storage.getAddressByEmail(recipient);
            if (!activeAddr) continue;

            const textContent = parsed.text || '';
            const htmlContent = parsed.html || '';
            const subject = parsed.subject || '(No Subject)';
            const fromAddr = parsed.from?.text || 'Unknown Sender';

            // Sanitize HTML strictly
            const cleanHtml = sanitizeEmailHtml(htmlContent);

            // Generate text preview (first 140 chars)
            const preview = (textContent || cleanHtml.replace(/<[^>]*>/g, ' '))
              .trim()
              .replace(/\s+/g, ' ')
              .slice(0, 140);

            // Extract verification OTP code & URLs
            const detectedCode = detectVerificationCode(textContent, subject);
            const detectedLinks = detectVerificationLinks(textContent, htmlContent);

            // Parse attachments (up to 5MB each)
            const attachments: AttachmentRecord[] = [];
            if (parsed.attachments && Array.isArray(parsed.attachments)) {
              for (const att of parsed.attachments) {
                if (att.size <= config.maxAttachmentSize) {
                  attachments.push({
                    id: crypto.randomUUID(),
                    filename: att.filename || 'attachment.dat',
                    contentType: att.contentType || 'application/octet-stream',
                    size: att.size,
                    contentBase64: att.content.toString('base64')
                  });
                }
              }
            }

            // Headers conversion
            const headersObj: Record<string, string | string[]> = {};
            if (parsed.headers) {
              for (const [key, value] of parsed.headers.entries()) {
                if (typeof value === 'string' || Array.isArray(value)) {
                  headersObj[key] = value as any;
                } else if (value && typeof value === 'object') {
                  headersObj[key] = JSON.stringify(value);
                }
              }
            }

            const messageRecord: MessageRecord = {
              id: crypto.randomUUID(),
              address: recipient,
              from: fromAddr,
              to: recipient,
              subject,
              text: textContent,
              html: htmlContent,
              sanitizedHtml: cleanHtml,
              preview: preview || 'No text content available',
              headers: headersObj,
              attachments,
              detectedCode,
              detectedLinks,
              createdAt: Date.now()
            };

            await storage.saveMessage(messageRecord);

            // Real-time broadcast to connected browser via SSE
            sseManager.broadcastNewMessage(recipient, messageRecord);
          }

          callback(null, '250 2.0.0 OK: message queued for delivery');
        } catch (processErr) {
          console.error('Error processing parsed message:', processErr);
          callback(new Error('451 4.3.0 Internal mail processing failure'));
        }
      });
    }
  });

  server.on('error', (err) => {
    console.error('SMTP Server runtime error:', err);
  });

  return server;
}
