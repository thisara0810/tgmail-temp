import sanitizeHtml from 'sanitize-html';

/**
 * Robust regex to detect verification OTPs and confirmation codes:
 * 1. 4 to 8 digit purely numeric codes (e.g. 1234, 482910, 93847291)
 * 2. 5 to 8 character alphanumeric uppercase/digit codes (e.g. ABC4D, 9X82Z)
 * Avoids matching common years (1990-2035) unless explicitly preceded by code/otp keywords.
 */
export function detectVerificationCode(text: string, subject: string = ''): string | null {
  const combined = `${subject}\n${text}`;

  // Priority 1: Code explicitly labeled with keywords (code, verification, otp, token, pin)
  const labeledRegex = /(?:code|verification|otp|pin|token|one-time\s+password|passcode)\s*(?:is|:|=|-)?\s*([A-Za-z0-9]{4,8})\b/i;
  const labeledMatch = combined.match(labeledRegex);
  if (labeledMatch && labeledMatch[1]) {
    const candidate = labeledMatch[1].trim();
    // Exclude words that are normal english words like 'that', 'with', 'from', etc.
    if (!/^[a-zA-Z]{4,8}$/.test(candidate) || candidate === candidate.toUpperCase()) {
      return candidate;
    }
  }

  // Priority 2: Standalone 6-digit numeric code (most standard OTP format)
  const sixDigitRegex = /\b([0-9]{6})\b/g;
  let match: RegExpExecArray | null;
  while ((match = sixDigitRegex.exec(combined)) !== null) {
    const num = match[1];
    // filter out typical years or dates
    if (num.startsWith('19') || num.startsWith('20')) {
      continue;
    }
    return num;
  }

  // Priority 3: Standalone 4 to 8 digit numeric code
  const numRegex = /\b([0-9]{4,8})\b/g;
  while ((match = numRegex.exec(combined)) !== null) {
    const num = match[1];
    if (num.length === 4 && (parseInt(num, 10) >= 1970 && parseInt(num, 10) <= 2030)) {
      continue; // Skip year 1970-2030
    }
    return num;
  }

  // Priority 4: Alphanumeric uppercase OTP (e.g., G-847291 or 8KD93)
  const hyphenCodeRegex = /\b([A-Z0-9]{1,4}-[A-Z0-9]{4,8})\b/;
  const hyphenMatch = combined.match(hyphenCodeRegex);
  if (hyphenMatch && hyphenMatch[1]) {
    return hyphenMatch[1];
  }

  return null;
}

/**
 * Extracts verification, confirmation, activation, and sign-in links from email content.
 */
export function detectVerificationLinks(text: string, html: string = ''): string[] {
  const links = new Set<string>();
  const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi;

  const searchPool = `${html}\n${text}`;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(searchPool)) !== null) {
    const url = match[0].replace(/[.,;:)]+$/, ''); // Strip trailing punctuation
    // Check if the URL looks like a verification, activation, or confirmation link
    if (
      /verify|confirm|activate|validate|token|signup|register|auth|password|reset|login/i.test(url)
    ) {
      links.add(url);
    }
  }

  return Array.from(links).slice(0, 5); // Return up to 5 relevant links
}

/**
 * Strict HTML sanitization:
 * - Strips all `<script>`, `<object>`, `<iframe>`, `<embed>`, `<form>`, `<input>`, `<button>` tags
 * - Strips javascript: URLs and event handlers (onclick, onload, etc.)
 * - Replaces remote image sources with placeholder or data attributes to prevent tracking by default
 */
export function sanitizeEmailHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  const cleaned = sanitizeHtml(rawHtml, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
      'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
      'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span',
      'img', 'font', 'center', 'sub', 'sup'
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'style', 'data-src'],
      '*': ['style', 'class', 'align', 'valign', 'bgcolor', 'color', 'border', 'cellpadding', 'cellspacing']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data', 'cid'],
    transformTags: {
      a: (tagName, attribs) => {
        // Enforce safe target and rel on all links
        attribs.target = '_blank';
        attribs.rel = 'noopener noreferrer nofollow';
        return { tagName, attribs };
      },
      img: (tagName, attribs) => {
        // Move remote images to data-src by default to prevent tracking
        if (attribs.src && attribs.src.startsWith('http')) {
          attribs['data-original-src'] = attribs.src;
          attribs['data-blocked'] = 'true';
          attribs.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="%2394a3b8" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
        }
        return { tagName, attribs };
      }
    }
  });

  return cleaned;
}
