#!/bin/bash
# Pobla la base de datos con datos de prueba.
set -e

cd "$(dirname "$0")/../apps/api"
source .venv/bin/activate

python -m app.scripts.seed
