#!/bin/bash
# Script de despliegue automático para Oracle Cloud
set -e

cd "$(dirname "$0")/.."
ROOT_DIR=$(pwd)

echo "🚀 Iniciando despliegue de MInfra..."

# 1. Traer cambios de git
git fetch origin main
git reset --hard origin/main

# 2. Actualizar backend
echo "📦 Actualizando backend (FastAPI)..."
cd "$ROOT_DIR/apps/api"
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
if [ -d "venv" ]; then
  source venv/bin/activate
elif [ -d ".venv" ]; then
  source .venv/bin/activate
fi
pip install -e . --quiet
alembic upgrade head

# 3. Compilar frontend (Next.js)
echo "⚡ Compilando frontend (Next.js)..."
cd "$ROOT_DIR/apps/web"
rm -rf .next node_modules/.cache
pnpm build

# 4. Reiniciar servicios
echo "🔄 Reiniciando servicios..."
pm2 restart all || true
sudo systemctl restart sdd-api
sudo systemctl reload nginx || true

echo "✅ ¡Despliegue completado exitosamente!"
