import crypto from 'node:crypto';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const ALPHANUMERIC = LETTERS + DIGITS;

/**
 * Generates a random local-part for a temp email address.
 * Length: 12–14 characters.
 * Allowed: lowercase letters (a-z) and digits (0-9) only.
 * Guaranteed to contain both letters and digits.
 * No dots, commas, hyphens, underscores or special characters.
 */
export function generateRandomLocalPart(): string {
  // Random length between 12 and 14 inclusive
  const length = 12 + crypto.randomInt(0, 3); // 12, 13, or 14

  while (true) {
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length];
    }

    // Must satisfy: contains at least one letter and at least one digit
    const hasLetter = /[a-z]/.test(result);
    const hasDigit = /[0-9]/.test(result);
    const validChars = /^[a-z0-9]{12,14}$/.test(result);

    if (hasLetter && hasDigit && validChars) {
      return result;
    }
  }
}

/**
 * Validates local part against the strict format:
 * - 12 to 14 characters
 * - lowercase letters and digits only
 * - contains at least one letter and one digit
 */
export function isValidLocalPart(localPart: string): boolean {
  if (!/^[a-z0-9]{12,14}$/.test(localPart)) {
    return false;
  }
  return /[a-z]/.test(localPart) && /[0-9]/.test(localPart);
}

/**
 * Generates a cryptographically secure random session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
