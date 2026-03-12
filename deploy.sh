#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────
APP_DIR="/var/www/pickfast"
REPO_BRANCH="main"

echo "═══════════════════════════════════════"
echo "  PickFast Deploy  —  $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════"

cd "$APP_DIR"

# ── Pull latest code ───────────────────────────────────────────
echo "→ Pulling latest from $REPO_BRANCH..."
git fetch origin "$REPO_BRANCH"
git reset --hard "origin/$REPO_BRANCH"

# ── Install dependencies ──────────────────────────────────────
echo "→ Installing root dependencies..."
npm ci --omit=dev

echo "→ Installing backend dependencies..."
cd backend
npm ci --omit=dev
cd ..

echo "→ Installing frontend dependencies..."
cd frontend
npm ci
echo "→ Building frontend..."
npm run build
cd ..

# ── Restart services ─────────────────────────────────────────
echo "→ Restarting PM2 processes..."
pm2 startOrRestart ecosystem.config.js --env production
pm2 save

echo ""
echo "✓ Deploy complete!"
echo "  Backend  → http://localhost:4000"
echo "  Frontend → http://localhost:3000"
echo ""
