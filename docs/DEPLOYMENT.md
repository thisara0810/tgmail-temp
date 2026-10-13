# Production Deployment Guide — TGMail Temp

This guide walks you through deploying TGMail Temp on a fresh Ubuntu 22.04 / 24.04 LTS VPS with a dedicated public IPv4 address.

---

## 1. Prerequisites & VPS Port 25 Verification

Many cloud hosting providers (DigitalOcean, AWS, GCP, Vultr, Linode) block outbound/inbound port 25 by default to prevent spam.
- **Providers known for open port 25**: Hetzner (often open upon ticket request), OVH, Scaleway, BuyVM, Kamatera.
- **Check if port 25 is open locally on the VPS**:
  ```bash
  sudo ufw allow 25/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw allow 4000/tcp # only if debugging direct API
  sudo ufw enable
  ```

---

## 2. Option A: Deployment via Docker Compose (Recommended)

### Step 1: Install Docker & Docker Compose
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Step 2: Clone repository & configure environment
```bash
git clone https://github.com/your-username/tgmail.git /var/www/tgmail
cd /var/www/tgmail

# Configure production .env
cp server/.env.example server/.env
nano server/.env
```
Ensure `DOMAIN=tgmail.com`, `CLIENT_ORIGIN=https://tgmail.com`, and `COOKIE_SECRET` is set to a 32+ character random string.

### Step 3: Launch containers
```bash
docker compose up -d --build
```
Verify containers are healthy:
```bash
docker compose ps
docker compose logs -f
```

---

## 3. Option B: Native Deployment (Node.js + Nginx + Systemd)

### Step 1: Install Node.js (v20+ or v22 LTS) & Nginx
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx
```

### Step 2: Build Server & Client
```bash
cd /var/www/tgmail/server
npm ci
npm run build

cd /var/www/tgmail/client
npm ci
npm run build
```

### Step 3: Install & Enable Systemd Service
```bash
sudo cp /var/www/tgmail/tgmail.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tgmail
sudo systemctl status tgmail
```

### Step 4: Configure Let's Encrypt SSL & Nginx
```bash
# Obtain Free SSL Certificate
sudo certbot certonly --nginx -d tgmail.com -d www.tgmail.com -d mail.tgmail.com

# Deploy Nginx host file
sudo cp /var/www/tgmail/nginx/tgmail.com.conf /etc/nginx/sites-available/tgmail.com
sudo ln -s /etc/nginx/sites-available/tgmail.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 4. Testing & Verification Checklist

- [ ] **DNS MX Resolution**: `dig MX tgmail.com +short` returns `10 mail.tgmail.com.`
- [ ] **SMTP Handshake**: `nc -zv mail.tgmail.com 25` returns `Connection to mail.tgmail.com 25 port [tcp/smtp] succeeded!`
- [ ] **HTTPS Web Interface**: Visit `https://tgmail.com` in your browser. Verify the green padlock, random email address generation, and countdown timer.
- [ ] **Live Real-time Delivery**: Open the site, copy the email (e.g. `xyz1234567890@tgmail.com`), send a test mail from Gmail. Confirm the mail pops up within 1-2 seconds with the audio notification and verification code chip.
