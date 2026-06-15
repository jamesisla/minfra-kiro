# Guía de Entorno de Desarrollo Local

## Requisitos previos

- Node.js 20+ y pnpm 9+
- Python 3.12+ y `uv`
- Docker + Docker Compose
- (Opcional) Ollama para modelos IA locales

## 1. Variables de entorno

```bash
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Editar cada archivo `.env` con tus valores. Para desarrollo local
los valores por defecto (PostgreSQL local vía Docker) ya funcionan.

## 2. Infraestructura (PostgreSQL + Redis)

```bash
docker compose up -d
docker compose ps   # verificar que db y redis estén "healthy"/"running"
```

## 3. Backend (FastAPI)

```bash
cd apps/api

# Crear entorno virtual e instalar dependencias
uv venv
source .venv/bin/activate     # Linux/macOS
uv pip install -e ".[dev]"

# Aplicar migraciones
alembic upgrade head

# Levantar servidor de desarrollo
uvicorn app.main:app --reload --port 8000
```

Verificar:
- http://localhost:8000/ → JSON con info del proyecto
- http://localhost:8000/docs → Swagger UI
- http://localhost:8000/api/v1/health → `{"status": "ok"}`

### Ejecutar tests

```bash
cd apps/api
source .venv/bin/activate
pytest -v                  # todos los tests
pytest --cov=app           # con coverage
ruff check .                # lint
mypy app                    # type check
```

## 4. Frontend (Next.js)

```bash
cd apps/web
pnpm install
pnpm dev
```

Verificar: http://localhost:3000

### Build de producción (verificación local)

```bash
pnpm build
pnpm start
```

## 5. Todo junto (script de conveniencia)

```bash
bash scripts/dev.sh
```

Levanta Docker (DB/Redis), backend y frontend en paralelo.

## 6. Crear una nueva migración

Después de modificar/agregar un modelo en `apps/api/app/models/`:

```bash
cd apps/api
source .venv/bin/activate
alembic revision --autogenerate -m "descripcion_del_cambio"
alembic upgrade head
```

**Siempre revisar el archivo de migración generado** antes de
aplicarlo — Alembic no siempre detecta correctamente cambios de
tipo de columna o renombres.

## 7. Datos de prueba (seed)

```bash
bash scripts/seed.sh
```

## Troubleshooting

| Problema | Solución |
|---|---|
| `pnpm: command not found` | `npm install -g pnpm` |
| Error de conexión a PostgreSQL | Verificar `docker compose ps` y que el puerto 5432 esté libre |
| `ModuleNotFoundError` en backend | Verificar que el venv esté activado (`source .venv/bin/activate`) |
| CORS error en frontend | Verificar `CORS_ORIGINS` en `apps/api/.env` incluye `http://localhost:3000` |
| Migraciones desincronizadas | `alembic downgrade base && alembic upgrade head` (⚠️ borra datos) |
