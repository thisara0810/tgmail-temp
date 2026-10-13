# TGMail Temp — Production DNS Setup Guide

To receive real incoming emails sent from Google Gmail, Microsoft Outlook, Yahoo, ProtonMail, and all global MTAs for `@tgmail.com`, you must configure your authoritative DNS records (e.g. at Cloudflare, Namecheap, Route 53, or GoDaddy).

---

## 1. Core DNS Records Table

Replace `203.0.113.10` with your VPS public IPv4 address (and your IPv6 address if applicable).

| Type | Name / Host | Value / Target | Priority | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | `mail.tgmail.com` | `203.0.113.10` | — | 300 (or Auto) | Points the mail server hostname to your VPS IP |
| **A** | `tgmail.com` | `203.0.113.10` | — | 300 (or Auto) | Web root frontend |
| **A** | `www.tgmail.com` | `203.0.113.10` | — | 300 (or Auto) | Web www redirect |
| **MX** | `@` (or `tgmail.com`) | `mail.tgmail.com` | **10** | 300 (or Auto) | Directs inbound email for `@tgmail.com` to your SMTP engine |
| **TXT** | `@` (or `tgmail.com`) | `v=spf1 -all` | — | 300 (or Auto) | **SPF Record**: Declares this domain never sends outbound email (receive-only) |
| **TXT** | `_dmarc.tgmail.com` | `v=DMARC1; p=reject; sp=reject; aspf=s;` | — | 300 (or Auto) | **DMARC Record**: Instructs other MTAs to reject any forged spoofed outbound mail |
| **TXT** | `*._domainkey.tgmail.com`| `v=DKIM1; p=` | — | 300 (or Auto) | **DKIM**: Blank null key confirming no signed outbound mail |

> **IMPORTANT Note on Cloudflare Proxy (Orange Cloud vs Grey Cloud)**:
> - For `mail.tgmail.com`: **MUST be DNS-only (Grey Cloud)**. Cloudflare does not proxy raw port 25 SMTP traffic on free/pro plans.
> - For `tgmail.com` and `www`: Can be proxied (Orange Cloud) for CDN/DDoS caching if desired, OR Grey Cloud if you let Nginx/Certbot handle SSL directly.

---

## 2. Reverse DNS (PTR Record)

Reverse DNS maps your server IP `203.0.113.10` back to the canonical hostname `mail.tgmail.com`.
- **Where to configure**: In your **VPS Hosting Provider's control panel** (Hetzner, DigitalOcean, Linode, OVH, Vultr, AWS EC2 elastic IP settings).
- **Setting**: Set the PTR record for IPv4 `203.0.113.10` -> `mail.tgmail.com`.
- **Why**: While TGMail Temp is receive-only, many enterprise sending MTAs (like Google Gmail) perform forward-confirmed reverse DNS (FCrDNS) checks before handing off mail to prevent spambot honeypots.

---

## 3. Verify DNS Propagation

Use `dig` or online DNS checkers:
```bash
# Verify MX record points to mail.tgmail.com
dig MX tgmail.com +short
# Output should be: 10 mail.tgmail.com.

# Verify A record of mail host
dig A mail.tgmail.com +short
# Output should be: 203.0.113.10

# Test port 25 reachability from the outside
nc -zv mail.tgmail.com 25
# or
telnet mail.tgmail.com 25
```
