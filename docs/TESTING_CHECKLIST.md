# End-to-End Testing & Verification Checklist

Follow this checklist to test TGMail Temp both locally during development and in production.

---

## 1. Automated Unit Tests

Run Vitest in the `/server` directory:
```bash
cd server
npm test
```

### Covered Test Cases:
1. **Address Local Part Format**:
   - Matches regex `^[a-z0-9]{12,14}$`.
   - Length between 12 and 14 characters.
   - Letters and numbers only (no dots, hyphens, underscores, or uppercase).
   - Contains both at least one letter and at least one digit.
2. **Code & OTP Detection**:
   - Extracts standard 6-digit verification codes (e.g. `482910`).
   - Extracts alphanumeric OTPs (e.g. `G8B9X`).
   - Ignores ordinary calendar years (1970–2030).
3. **HTML Sanitization**:
   - Strips malicious `<script>` tags, inline event handlers, and `<iframe>`s.
   - Strips `javascript:` pseudo-protocols.
   - Neutralizes tracking pixels by substituting `src` with a safe placeholder and setting `data-original-src`.
4. **Expiry & Cascading Deletion**:
   - Expired addresses are cleaned after 30 minutes.
   - Associated messages and attachments are wiped from memory.
   - Session cannot extend beyond 2 times.

---

## 2. Testing SMTP Delivery with Real Email (e.g., from Gmail)

### Step 1: Open TGMail Temp
Visit your deployed site `https://tgmail.com` or local client `http://localhost:5173`.
Copy your active address: e.g. `jaiswndklas342@tgmail.com`.

### Step 2: Send from Gmail
1. Open your regular Gmail / Outlook account.
2. Compose a new message:
   - **To**: `jaiswndklas342@tgmail.com`
   - **Subject**: `Verify your registration - Code 849201`
   - **Body**:
     ```text
     Hi there,

     Thanks for testing TGMail Temp. Your verification code is: 849201
     Or click here to activate: https://example.com/auth/verify?token=abc987

     Attached is a sample document for testing.
     ```
   - Attach any file (e.g., PDF, image, text file under 5 MB).
3. Hit **Send**.

### Step 3: Observe Real-Time Inbox
- The message should appear in the TGMail Temp inbox within **1–3 seconds** via Server-Sent Events (SSE).
- The audio notification chime plays (if sound/alerts are enabled).
- The highlighted **"OTP: 849201"** chip and **"Copy Code"** button appear automatically.
- Clicking **"Open Verification Link"** opens the activation link safely in a new tab.
- Click the attachment to download and verify file integrity.

---

## 3. Testing Local SMTP Handshake with Telnet / Netcat / Swaks

You can test local inbound delivery without an external domain using `telnet` or `swaks`:

```bash
# Connect to SMTP server port 25 (or port 2525 in dev)
telnet localhost 25
```
Send the SMTP commands:
```smtp
EHLO localhost
MAIL FROM:<test@example.com>
RCPT TO:<jaiswndklas342@tgmail.com>
DATA
Subject: Local Test Verification Code
From: test@example.com
To: jaiswndklas342@tgmail.com

Hello! Your activation code is 951234.
.
QUIT
```
- **Expected result**:
  - `RCPT TO` returns `250 OK` for the active address.
  - `RCPT TO` for non-existent addresses returns `550 5.1.1 Recipient address does not exist or has expired`.
  - Upon sending the final `.`, message arrives instantly in the browser.

---

## 4. UI & Session Flow Testing

| Action | Expected Result |
| :--- | :--- |
| **First Visit** | Generates 12–14 char random address, begins 30:00 countdown timer. |
| **Copy Button** | Copies email to clipboard, changes button state to "Copied!" for 2 seconds. |
| **Page Refresh** | Session cookie restores same address and countdown time left. |
| **+10m Button** | Adds 10 minutes to the timer (can be used 2 times total). |
| **Change Email** | Old address deleted immediately; fresh address generated with fresh 30:00 timer. |
| **Delete Email** | Dialog prompt confirmation; permanently deletes address and resets inbox. |
| **Expiry (00:00)** | Switches to "This Address Has Expired" overlay with "Generate New Email" button. |
