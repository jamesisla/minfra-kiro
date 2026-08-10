#!/bin/bash
# Script de despliegue automático para Oracle Cloud
set -e

cd "$(dirname "$0")/.."
ROOT_DIR=$(pwd)

echo "🚀 Iniciando despliegue de MInfra..."

# 1. Traer cambios de git
git fetch origin main
git reset --hard origin/main

# 2. Sincronizar repositorio a /var/www/sdd-project si el servicio sdd-api corre desde allí
if [ -d "/var/www/sdd-project" ] && [ "$ROOT_DIR" != "/var/www/sdd-project" ]; then
  echo "📂 Sincronizando repositorio a /var/www/sdd-project..."
  sudo cp -r "$ROOT_DIR/apps" "$ROOT_DIR/scripts" "$ROOT_DIR/package.json" /var/www/sdd-project/ 2>/dev/null || true
  sudo chown -R $(whoami):$(whoami) /var/www/sdd-project 2>/dev/null || true
fi

# 3. Actualizar backend (FastAPI)
TARGET_API_DIR="$ROOT_DIR/apps/api"
if [ -d "/var/www/sdd-project/apps/api" ]; then
  TARGET_API_DIR="/var/www/sdd-project/apps/api"
fi

echo "📦 Actualizando backend (FastAPI) en $TARGET_API_DIR..."
cd "$TARGET_API_DIR"
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
if [ -d "venv" ]; then
  source venv/bin/activate
elif [ -d ".venv" ]; then
  source .venv/bin/activate
elif [ -d "/var/www/sdd-project/apps/api/venv" ]; then
  source /var/www/sdd-project/apps/api/venv/bin/activate
fi
pip install -e . --quiet || true
alembic upgrade head || true

# 4. Compilar frontend (Next.js)
echo "⚡ Compilando frontend (Next.js)..."
cd "$ROOT_DIR/apps/web"
rm -rf .next node_modules/.cache
export NODE_OPTIONS="--max-old-space-size=1536"
pnpm build || npm run build

# 5. Reiniciar servicios
echo "🔄 Reiniciando servicios..."
sudo systemctl restart sdd-api || true

cd "$ROOT_DIR/apps/web"
if pm2 list 2>/dev/null | grep -q "sdd-web"; then
  pm2 restart sdd-web || pm2 restart all
else
  pm2 start npm --name "sdd-web" -- start || pm2 start pnpm --name "sdd-web" -- start
  pm2 save || true
fi

sudo systemctl reload nginx || true

echo "✅ ¡Despliegue completado exitosamente!"
