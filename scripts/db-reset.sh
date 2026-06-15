#!/bin/bash
# Reinicia la base de datos local desde cero (⚠️ borra todos los datos).
set -e

cd "$(dirname "$0")/.."

read -p "⚠️  Esto eliminará TODOS los datos locales. ¿Continuar? (s/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "Cancelado."
  exit 0
fi

echo "🗑️  Deteniendo y eliminando contenedor de base de datos..."
docker compose down -v

echo "🚀 Levantando base de datos nueva..."
docker compose up -d db
sleep 3  # esperar a que postgres esté listo

cd apps/api
source .venv/bin/activate
echo "📐 Aplicando migraciones..."
alembic upgrade head

echo "✅ Base de datos reiniciada."
echo "Ejecuta 'bash scripts/seed.sh' si quieres datos de prueba."
