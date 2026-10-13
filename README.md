# TGMail Temp — Production-Ready Temporary Disposable Email Service

An end-to-end, high-performance temporary email web service engineered for the domain `tgmail.com`. Built with a TypeScript Node.js backend running an inbound SMTP server (`smtp-server` + `mailparser`) and a modern responsive React + Vite + Tailwind CSS frontend.

---

## 🌟 Key Features

1. **Strict 12–14 Character Local-Part Generation**:
   - Random addresses matching `^[a-z0-9]{12,14}$` containing both letters and digits.
   - Zero special characters before `@tgmail.com`.
2. **30-Minute Life Cycle**:
   - Live visual countdown timer with automatic cascading server-side destruction of addresses, emails, and attachments upon expiry.
   - Optional `+10 minutes` extension button (maximum 2 times).
3. **Instant Action Controls**:
   - **Copy**: Copies address with interactive toast confirmation.
   - **Change Email**: Immediately deletes current address/messages and provisions a fresh address.
   - **Delete Email**: Prompts for confirmation, wipes all data permanently, and creates a fresh address.
   - **Refresh**: Manual sync button with loading animation.
4. **Real-Time Inbox Streaming**:
   - Instant push notifications via Server-Sent Events (SSE).
   - 5-second polling fallback if SSE is disconnected.
   - Browser audio chime and opt-in desktop notifications.
5. **Smart Message Inspection**:
   - **Auto-detected Verification Codes & OTPs** (4–8 digits, alphanumeric) with a one-click "Copy Code" button.
   - **Auto-detected Action Links** with a safe "Open Verification Link" button.
   - **Strict HTML Sanitization & Tracking Pixel Blocking** (DOMPurify/sanitize-html inside a sandboxed iframe with an opt-in "Load remote images" switch).
   - Plain text, raw RFC822 headers, and file attachment downloads (up to 5 MB per file).
6. **Robust Session Continuity**:
   - Secure random session token stored in an HttpOnly cookie with `localStorage` fallback. Returning within 30 minutes restores your inbox.

---

## 🏗 Architecture & Technologies

- **Backend**: Node.js, TypeScript, Express, Helmet, CORS, Rate-Limit, Cookie-Parser.
- **SMTP Agent**: Inbound port 25 listener via `smtp-server` and `mailparser`.
  - Rejects unknown or expired addresses during `RCPT TO` with `550 5.1.1 Relay access denied`.
  - Max 10 MB per message, max 5 MB per attachment, max 50 messages per mailbox.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide icons.
- **Reverse Proxy**: Nginx with SSL & unbuffered SSE stream support.
- **Deployment**: Docker & Docker Compose or native Systemd.

---

## 🚀 Quick Start (Local Development)

### 1. Start Server
```bash
cd server
npm install
npm run dev
```
The REST API and SSE stream will start on `http://localhost:4000` and the SMTP receiver will listen on port 25 (or port 2525 in dev).

### 2. Start Frontend Client
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Running Unit Tests

```bash
cd server
npm test
```

Tests cover:
- Local-part generation regex and validity checks.
- OTP code and verification link extraction algorithms.
- Tracking image blocking and HTML sanitization.
- Expiry cascades and storage cleanup routines.

---

## 📖 Documentation
- [DNS Setup Table & Guide](docs/DNS_SETUP.md)
- [Production Deployment Guide](docs/DEPLOYMENT.md)
- [Testing Checklist](docs/TESTING_CHECKLIST.md)
