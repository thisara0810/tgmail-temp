import { AddressRecord, MessageRecord } from '../types/index.js';
import { storage } from './storage.js';
import { sseManager } from './sse.js';
import {
  detectVerificationCode,
  detectVerificationLinks,
  sanitizeEmailHtml
} from '../utils/emailParser.js';

interface MailTmAccount {
  id: string;
  address: string;
  token: string;
}

const activeAccounts = new Map<string, MailTmAccount>(); // keyed by address
const activePollers = new Map<string, NodeJS.Timeout>();

export async function fetchAvailableDomain(): Promise<string> {
  try {
    const res = await fetch('https://api.mail.tm/domains');
    const data: any = await res.json();
    const domains = data['hydra:member'];
    if (domains && domains.length > 0) {
      return domains[0].domain;
    }
  } catch (err) {
    console.error('Error fetching free domain:', err);
  }
  return 'maxxspace.com';
}

export async function createRealLiveMailAccount(address: string): Promise<boolean> {
  const password = 'TempPassword123!';
  try {
    // 1. Create account
    const accRes = await fetch('https://api.mail.tm/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    });

    if (!accRes.ok && accRes.status !== 422) {
      console.error('Failed to create mail.tm account:', await accRes.text());
      return false;
    }

    // 2. Obtain JWT Token
    const tokenRes = await fetch('https://api.mail.tm/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    });

    if (!tokenRes.ok) {
      console.error('Failed to get mail.tm token:', await tokenRes.text());
      return false;
    }

    const tokenData: any = await tokenRes.json();
    const token = tokenData.token;

    activeAccounts.set(address.toLowerCase(), {
      id: tokenData.id || '',
      address: address.toLowerCase(),
      token
    });

    // 3. Start live background poller (every 3 seconds) for real Gmail inbound
    startLiveInboxPoller(address.toLowerCase(), token);
    return true;
  } catch (err) {
    console.error('Error in createRealLiveMailAccount:', err);
    return false;
  }
}

function startLiveInboxPoller(address: string, token: string) {
  if (activePollers.has(address)) {
    clearInterval(activePollers.get(address));
  }

  const seenIds = new Set<string>();

  const poller = setInterval(async () => {
    try {
      // Check if address is still alive in our storage
      const existingAddr = await storage.getAddressByEmail(address);
      if (!existingAddr) {
        clearInterval(poller);
        activePollers.delete(address);
        activeAccounts.delete(address);
        return;
      }

      // Fetch messages from global mail network
      const res = await fetch('https://api.mail.tm/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) return;

      const data: any = await res.json();
      const messages = data['hydra:member'] || [];

      for (const m of messages) {
        if (seenIds.has(m.id)) continue;
        seenIds.add(m.id);

        // Fetch full message details (HTML, text, etc.)
        const detailRes = await fetch(`https://api.mail.tm/messages/${m.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!detailRes.ok) continue;
        const detail: any = await detailRes.json();

        const textContent = detail.text || '';
        const htmlContent = detail.html && detail.html[0] ? detail.html[0] : (detail.html || '');
        const subject = detail.subject || '(No Subject)';
        const fromAddr = detail.from?.address
          ? `${detail.from.name || ''} <${detail.from.address}>`.trim()
          : 'Unknown Sender';

        const cleanHtml = sanitizeEmailHtml(htmlContent);
        const preview = (detail.intro || textContent || cleanHtml.replace(/<[^>]*>/g, ' '))
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 140);

        const detectedCode = detectVerificationCode(textContent, subject);
        const detectedLinks = detectVerificationLinks(textContent, htmlContent);

        const messageRecord: MessageRecord = {
          id: m.id,
          address: address.toLowerCase(),
          from: fromAddr,
          to: address.toLowerCase(),
          subject,
          text: textContent,
          html: htmlContent,
          sanitizedHtml: cleanHtml,
          preview: preview || 'No text content available',
          headers: {},
          attachments: (detail.attachments || []).map((att: any) => ({
            id: att.id,
            filename: att.filename,
            contentType: att.contentType,
            size: att.size
          })),
          detectedCode,
          detectedLinks,
          createdAt: new Date(detail.createdAt).getTime() || Date.now()
        };

        // Save into local mailbox
        await storage.saveMessage(messageRecord);

        // Push real-time event to user's browser via SSE
        sseManager.broadcastNewMessage(address, messageRecord);
      }
    } catch {
      // background polling error - ignore
    }
  }, 3000);

  activePollers.set(address, poller);
}
