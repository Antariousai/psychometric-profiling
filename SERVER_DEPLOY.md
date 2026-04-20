# Server Deployment Guide
## Antarious Psychometric Profiling — `pmp.antarious.com`

Target server: Ubuntu + Nginx, user `foysal`, path `/home/foysal/antarious/`
This app is built as a **static web export** from Expo (`dist/` folder served by Nginx).

---

sudo -iu foysal --- switch user
## 1. Prerequisites on the Server

SSH into your server first:
```bash
ssh foysal@your-server-ip
```

### Check / install Node.js (need v20+)
```bash
node -v   # should be 20.x or higher
```

If not installed or too old:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v
```

---

## 2. Set Up SSH Deploy Key for This Private Repo

This creates a separate deploy key for `antarious-psychometric-profiling`, keeping it isolated from other apps (e.g. your existing Next.js deploy key).

### 2a. Generate the key pair (on the server, as user `foysal`)
```bash
ssh-keygen -t ed25519 -C "deploy-antarious-pmp" -f /home/foysal/.ssh/id_ed25519_antarious_pmp
# Press Enter twice for no passphrase
```

### 2b. Print the public key — copy this
```bash
cat /home/foysal/.ssh/id_ed25519_antarious_pmp.pub
```

### 2c. Add to GitHub as a Deploy Key
1. Go to: `https://github.com/foysal-mahmud-hasan/antarious-psychometric-profiling`
2. Settings → Deploy keys → Add deploy key
3. Title: `server-pmp`
4. Key: paste the public key from 2b
5. Leave "Allow write access" **unchecked** (read-only is fine for deploy)
6. Click **Add key**

### 2d. Create / update `~/.ssh/config`
```bash
nano /home/foysal/.ssh/config
```

Add this block (append below your existing Next.js entry if one exists):
```
Host github-antarious-pmp
    HostName github.com
    User git
    IdentityFile /home/foysal/.ssh/id_ed25519_antarious_pmp
    IdentitiesOnly yes
```

Save and set correct permissions:
```bash
chmod 600 /home/foysal/.ssh/config
chmod 600 /home/foysal/.ssh/id_ed25519_antarious_pmp
```

### 2e. Test the connection
```bash
ssh -T github-antarious-pmp
# Expected: "Hi foysal-mahmud-hasan! You've successfully authenticated..."
```

---

## 3. Clone the Repository

```bash
mkdir -p /home/foysal/antarious-pmp
cd /home/foysal/antarious-pmp

# Use the SSH alias from config — note: replace github.com with the Host alias
git clone git@github-antarious-pmp:foysal-mahmud-hasan/antarious-psychometric-profiling.git .
```

---

## 4. Install Dependencies

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required because `react-native-worklets` has peer dep conflicts with React 19. This is expected and safe.

---

## 5. Build the Static Web Export

Add the build script to `package.json` (do this once, commit it):
```bash
# On your local machine, edit package.json scripts section:
"build:web": "expo export --platform web"
```

Then on the server:
```bash
npx expo export --platform web
```

This produces a `dist/` folder with all static files (HTML, JS, CSS, assets).

Expected output:
```
dist/
  index.html
  _expo/
    static/
      js/
      css/
  assets/
```

---

## 6. Nginx Configuration

Create the site config:
```bash
sudo nano /etc/nginx/sites-available/pmp.antarious.com
```

Paste this configuration:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name pmp.antarious.com;

    # Redirect HTTP to HTTPS (certbot will update this block after SSL setup)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name pmp.antarious.com;

    root /home/foysal/antarious-pmp/dist;
    index index.html;

    # SSL certs (certbot will fill these in)
    # ssl_certificate /etc/letsencrypt/live/pmp.antarious.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/pmp.antarious.com/privkey.pem;
    # include /etc/letsencrypt/options-ssl-nginx.conf;
    # ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Expo Router uses client-side routing — all paths must serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location /_expo/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1000;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/pmp.antarious.com /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

---

## 7. Issue SSL Certificate with Certbot

```bash
sudo certbot --nginx -d pmp.antarious.com
```

Follow the prompts. Certbot will automatically:
- Issue the Let's Encrypt certificate
- Update your Nginx config with the SSL cert paths
- Set up auto-renewal

Verify renewal works:
```bash
sudo certbot renew --dry-run
```

---

## 8. Deployment Script (for future updates)

Create a deploy script at `/home/foysal/antarious/deploy-pmp.sh`:
```bash
nano /home/foysal/antarious/deploy-pmp.sh
```

Paste:
```bash
#!/bin/bash
set -e

APP_DIR="/home/foysal/antarious-pmp"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull git@github-antarious-pmp:foysal-mahmud-hasan/antarious-psychometric-profiling.git main

echo "==> Installing dependencies..."
npm install --legacy-peer-deps

echo "==> Building web export..."
npx expo export --platform web

echo "==> Reloading Nginx..."
sudo systemctl reload nginx

echo "==> Deploy complete. Live at https://pmp.antarious.com"
```

Make it executable:
```bash
chmod +x /home/foysal/antarious/deploy-pmp.sh
```

To deploy any future update:
```bash
/home/foysal/antarious/deploy-pmp.sh
```

### Allow Nginx reload without password (optional)

To let the deploy script run `sudo systemctl reload nginx` without a password prompt:
```bash
sudo visudo
```
Add this line at the bottom:
```
foysal ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
```

---

## 9. Directory Structure After Setup

```
/home/foysal/
├── .ssh/
│   ├── config                          # SSH aliases for all apps
│   ├── id_ed25519_antarious_pmp        # Private deploy key
│   └── id_ed25519_antarious_pmp.pub    # Public deploy key (added to GitHub)
└── antarious/
    ├── deploy-pmp.sh                   # Deployment script
    └── antarious-psychometric-profiling/
        ├── dist/                       # Built static files (served by Nginx)
        ├── app/
        ├── components/
        └── ...
```

---

## 10. Verify Everything

```bash
# Check Nginx is running
sudo systemctl status nginx

# Check the site is live
curl -I https://pmp.antarious.com

# Check cert expiry
sudo certbot certificates
```

---

## Quick Reference — Full Setup Order

1. Install Node.js 20+ on server
2. Generate deploy key → add public key to GitHub
3. Add SSH config block for `github-antarious-pmp`
4. `git clone git@github-antarious-pmp:...`
5. `npm install --legacy-peer-deps`
6. `npx expo export --platform web`
7. Create Nginx config → enable → `nginx -t` → reload
8. `certbot --nginx -d pmp.antarious.com`
9. Create `deploy-pmp.sh` script

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `git clone` permission denied | Re-check deploy key was added to GitHub; test with `ssh -T github-antarious-pmp` |
| `npm install` peer dep error | Always use `--legacy-peer-deps` for this project |
| White screen / 404 on routes | Nginx `try_files` must point to `/index.html` — Expo Router is SPA |
| Fonts not loading | Run `npx expo export --platform web` again; ensure `dist/assets/` is present |
| Certbot fails | Make sure DNS for `pmp.antarious.com` points to this server's IP first |
