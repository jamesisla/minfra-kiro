#!/bin/bash
# Levanta todo el entorno de desarrollo: infra + backend + frontend.
set -e

cd "$(dirname "$0")/.."
ROOT_DIR=$(pwd)

echo "🚀 Iniciando entorno de desarrollo SDD..."

# ── 1. Infraestructura (Postgres + Redis) ──
docker compose up -d
echo "✅ PostgreSQL y Redis corriendo"

# ── 2. LiteLLM proxy (si está configurado) ──
if command -v litellm &>/dev/null; then
  if ! pgrep -f "litellm" > /dev/null; then
    [ -f ~/.config/sdd/keys.env ] && source ~/.config/sdd/keys.env
    [ -f ~/.config/litellm/config.yaml ] && \
      litellm --config ~/.config/litellm/config.yaml --port 4000 &>/dev/null &
    echo "✅ LiteLLM proxy en puerto 4000"
  fi
fi

# ── 3. Backend FastAPI ──
cd "$ROOT_DIR/apps/api"
if [ ! -d ".venv" ]; then
  echo "📦 Creando entorno virtual del backend..."
  uv venv
  source .venv/bin/activate
  uv pip install -e ".[dev]"
else
  source .venv/bin/activate
fi

# Aplicar migraciones pendientes
alembic upgrade head

uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "✅ FastAPI (PID $BACKEND_PID) en http://localhost:8000"

# ── 4. Frontend Next.js ──
cd "$ROOT_DIR/apps/web"
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependencias del frontend..."
  pnpm install
fi

pnpm dev &
FRONTEND_PID=$!
echo "✅ Next.js (PID $FRONTEND_PID) en http://localhost:3000"

echo ""
echo "──────────────────────────────────────────"
echo "🌐 Frontend:  http://localhost:3000"
echo "⚡ API:        http://localhost:8000"
echo "📚 API Docs:  http://localhost:8000/docs"
echo "──────────────────────────────────────────"
echo "Presiona Ctrl+C para detener backend y frontend."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
