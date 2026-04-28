#!/bin/bash
# KitsunePrints Deploy Script
# Run on the DreamHost VPS after uploading the project files.
#
# Usage:
#   1. Upload to VPS (rsync, scp, git clone, etc.)
#   2. cd into the project directory
#   3. chmod +x deploy.sh && ./deploy.sh

set -e

echo "🐱 KitsunePrints Deploy"
echo "======================="

# Check Node
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install it first."
    exit 1
fi
echo "✓ Node.js $(node -v)"

# Install Node deps
echo ""
echo "Installing Node dependencies..."
npm install --production 2>&1 | tail -3

# Build frontend
echo ""
echo "Building frontend..."
npm run build 2>&1 | tail -5

# PM2 process management
if command -v pm2 &> /dev/null; then
    echo ""
    echo "Starting with PM2..."
    pm2 delete kitsuneprints 2>/dev/null || true
    pm2 start server.cjs --name kitsuneprints
    pm2 save
    echo "✓ Running as PM2 process 'kitsuneprints'"
    echo "  pm2 logs kitsuneprints   ~ view logs"
    echo "  pm2 restart kitsuneprints ~ restart"
else
    echo ""
    echo "PM2 not found. Install for process management:"
    echo "  npm install -g pm2"
    echo "  pm2 start server.cjs --name kitsuneprints"
    echo "  pm2 save && pm2 startup"
fi

echo ""
echo "✅ KitsunePrints deployed on port 9003"
echo ""
echo "Apache vhost should reverse-proxy prints.kitsuneden.net to localhost:9003:"
echo "  ProxyPass / http://localhost:9003/"
echo "  ProxyPassReverse / http://localhost:9003/"
echo ""
echo "Or serve dist/ as fully static under DocumentRoot — there's no server-side"
echo "logic, all composition + zip generation runs in the browser."
