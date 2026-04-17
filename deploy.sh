#!/bin/bash
# =============================================================
# Sahlaa POS - Automated Deployment Script
# Server: 76.13.11.228 | Domain: sahlaa-ai.lamarpos.cloud
# =============================================================
set -e

# ── Config ────────────────────────────────────────────────────
REPO_URL="https://github.com/Omar1Darweesh/magd_store_vol1.git"
BRANCH="magd_store_vol4"
APP_DIR="/root/app"
DB_NAME="sahlaa_pos"
DB_USER="sahlaa"
DOMAIN="sahlaa-ai.lamarpos.cloud"
SERVER_IP="76.13.11.228"

echo ""
echo "============================================"
echo "   Sahlaa POS - Deployment Script"
echo "============================================"
echo ""

# ── Prompt for credentials ────────────────────────────────────
read -sp "Enter a password for the PostgreSQL database user 'sahlaa': " DB_PASS
echo ""
read -sp "Confirm password: " DB_PASS_CONFIRM
echo ""

if [ "$DB_PASS" != "$DB_PASS_CONFIRM" ]; then
    echo "ERROR: Passwords do not match. Exiting."
    exit 1
fi

JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo ""
echo "--- Step 1: Installing system packages ---"

sudo apt-get update -qq

# Node.js 20
if ! command -v node &>/dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js $(node -v) is already installed."
fi

# PostgreSQL
if ! command -v psql &>/dev/null; then
    echo "Installing PostgreSQL..."
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
else
    echo "PostgreSQL already installed."
fi

# PM2
if ! command -v pm2 &>/dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
else
    echo "PM2 already installed."
fi

# nginx
if ! command -v nginx &>/dev/null; then
    echo "Installing nginx..."
    sudo apt-get install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
else
    echo "nginx already installed."
fi

echo ""
echo "--- Step 2: Setting up PostgreSQL database ---"

sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
  ELSE
    ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')
\gexec

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL

echo "Database '$DB_NAME' is ready."

echo ""
echo "--- Step 3: Cloning / updating repository ---"

if [ -d "$APP_DIR/.git" ]; then
    echo "Repo exists — pulling latest changes..."
    cd "$APP_DIR"
    git fetch origin
    git checkout "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    echo "Cloning repository..."
    # If repo is private, git will prompt for GitHub credentials here.
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
    git checkout "$BRANCH"
fi

echo ""
echo "--- Step 4: Writing backend .env ---"

# URL-encode the password so special chars like @ ! # don't break the connection string
DB_PASS_ENCODED=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$DB_PASS")

cat > "$APP_DIR/backend/.env" <<ENV
DATABASE_URL="postgresql://$DB_USER:$DB_PASS_ENCODED@localhost:5432/$DB_NAME?schema=public"
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_EXPIRES_IN="7d"
PORT=3000
HOST=0.0.0.0
ENV

echo "backend/.env written."

echo ""
echo "--- Step 5: Building backend ---"

cd "$APP_DIR/backend"
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
echo "Backend built."

echo ""
echo "--- Step 6: Building frontend apps ---"

cd "$APP_DIR/backoffice"
npm install
npm run build
echo "Backoffice built."

cd "$APP_DIR/pos-client"
npm install
npm run build
echo "POS Client built."

echo ""
echo "--- Step 7: Starting backend with PM2 ---"

cd "$APP_DIR/backend"

# Find the actual compiled main.js (NestJS can output to dist/ or dist/src/)
MAIN_JS=$(find "$APP_DIR/backend/dist" -name "main.js" | head -1)
if [ -z "$MAIN_JS" ]; then
    echo "ERROR: Could not find dist/main.js — rebuilding backend..."
    npm run build
    MAIN_JS=$(find "$APP_DIR/backend/dist" -name "main.js" | head -1)
fi

if [ -z "$MAIN_JS" ]; then
    echo "ERROR: Build failed, main.js still not found. Exiting."
    exit 1
fi

echo "Starting backend from: $MAIN_JS"
pm2 delete sahlaa-backend 2>/dev/null || true
pm2 start "$MAIN_JS" --name "sahlaa-backend"
pm2 save

# Register PM2 to auto-start on reboot (running as root)
pm2 startup systemd -u root --hp /root 2>/dev/null || true
systemctl enable pm2-root 2>/dev/null || true

echo ""
echo "--- Step 8: Configuring nginx ---"

# Write HTTP-only config — Certbot will upgrade to HTTPS automatically when run
tee /etc/nginx/sites-available/sahlaa-ai.lamarpos.cloud >/dev/null <<'NGINXEOF'
# Backoffice (admin panel)
server {
    listen 80;
    server_name sahlaa-ai.lamarpos.cloud;

    location / {
        root /root/app/backoffice/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}

# POS Client (cashier screen) on port 8080
server {
    listen 8080;
    server_name sahlaa-ai.lamarpos.cloud;

    location / {
        root /root/app/pos-client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/sahlaa-ai.lamarpos.cloud /etc/nginx/sites-enabled/sahlaa-ai.lamarpos.cloud
nginx -t && systemctl reload nginx
echo "nginx configured."

echo ""
echo "--- Step 8b: Installing SSL certificate ---"
if command -v certbot &>/dev/null; then
    certbot --nginx -d sahlaa-ai.lamarpos.cloud --non-interactive --agree-tos --register-unsafely-without-email --redirect 2>/dev/null \
        || echo "Certbot failed or cert already exists — continuing."
else
    apt-get install -y certbot python3-certbot-nginx -qq
    certbot --nginx -d sahlaa-ai.lamarpos.cloud --non-interactive --agree-tos --register-unsafely-without-email --redirect 2>/dev/null \
        || echo "Certbot failed — site is running on HTTP for now."
fi

echo ""
echo "--- Step 9: Opening firewall ports ---"

if command -v ufw &>/dev/null; then
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # Backoffice
    sudo ufw allow 8080/tcp  # POS Client
    sudo ufw --force enable
    echo "Firewall updated."
else
    echo "ufw not found — skipping firewall setup."
fi

echo ""
echo "--- Step 10: Seeding database ---"

cd "$APP_DIR/backend"
npx ts-node --transpile-only prisma/seed.ts
echo "Database seeded."

echo ""
echo "============================================"
echo "   Deployment Complete!"
echo "============================================"
echo ""
echo "  Backoffice (admin): https://$DOMAIN"
echo "  POS Client:         https://$DOMAIN:8080"
echo "  API:                https://$DOMAIN/api"
echo ""
echo "  pm2 status              -- check backend"
echo "  pm2 logs sahlaa-backend -- view logs"
echo "============================================"
echo ""
