# SDD Project Template — Next.js + FastAPI

Plantilla de monorepo para desarrollo **Software Driven Development (SDD)**,
orientada a proyectos de mediana envergadura para universidades y centros
de formación técnica.

## MInfra — Módulo de Infraestructura Universitaria

Sistema de gestión de infraestructura para universidades con múltiples sedes.
Permite navegar la estructura **Sede → Edificio → Piso** y visualizar planos
de planta a partir de archivos DXF de AutoCAD.

### Funcionalidades
- 🏛️ Árbol de navegación lateral: Sede → Edificio → Piso
- 📐 Visor de planos DXF con zoom, pan y selección de entidades
- 💡 Click en elementos del plano → panel flotante con información
- 🌗 Modo claro / oscuro con toggle en el header
- 📤 Carga de archivos `.dxf` directamente desde la UI
- 🏷️ Detección automática de tipos (salas, oficinas, baños, pasillos, etc.)

### Carga de planos DXF

Los planos DXF se cargan **por piso**. En el sidebar, al lado de cada piso
hay un ícono de subida ↑. Hacer clic abre el selector de archivo.

Convención de nombres esperada:
```
S{sede}_{edificio}_{piso}.dxf   → Ej: S1_A_1.dxf (Sede 1, Edificio A, Piso 1)
```

### Setup rápido del módulo

```bash
# 1. Instalar dependencia de procesamiento DXF
cd apps/api
uv pip install ezdxf

# 2. Ejecutar migración de infraestructura
alembic upgrade head

# 3. Seed de datos de ejemplo (opcional)
python -m app.scripts.seed_infrastructure

# 4. Crear un usuario admin para login
python -m app.scripts.seed   # o via /api/v1/auth/register
```

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + Shadcn/UI |
| Backend | FastAPI (Python 3.12) + SQLAlchemy 2.0 (async) + Alembic |
| Base de datos | PostgreSQL 16 |
| Cache / Colas | Redis |
| Auth | JWT propio (extensible a Supabase Auth) |
| Tipos compartidos | `packages/shared-types` (TypeScript) |
| Monorepo | Turborepo + pnpm workspaces |
| IA | LiteLLM (proxy multi-modelo) + Ollama (local) |

## Estructura

```
apps/web      → Frontend Next.js
apps/api      → Backend FastAPI
packages/     → Código/tipos compartidos
docs/         → Documentación + contexto IA
scripts/      → Automatización (dev, db, IA)
.claude/      → Contexto del proyecto para agentes IA
.cursor/      → Reglas IA específicas de Cursor IDE
```

## Quick Start

```bash
# 1. Clonar / copiar plantilla
cp -r sdd-project-template mi-proyecto && cd mi-proyecto

# 2. Configurar variables de entorno
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
# editar los .env con tus valores

# 3. Levantar infraestructura (DB + Redis)
docker compose up -d

# 4. Backend
cd apps/api
uv venv && source .venv/bin/activate
uv pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 5. Frontend (en otra terminal)
cd apps/web
pnpm install
pnpm dev

# O usar el script todo-en-uno:
bash scripts/dev.sh
```

- Frontend: http://localhost:3000
- API: http://localhost:8000
- Docs API (Swagger): http://localhost:8000/docs
- pgAdmin (opcional): `docker compose --profile tools up -d` → http://localhost:5050

## Documentación

- [`docs/architecture/README.md`](docs/architecture/README.md) — decisiones de arquitectura (ADR)
- [`docs/ai-context/`](docs/ai-context/) — glosario, reglas de negocio y modelo de datos para IA
- [`docs/setup/local-dev.md`](docs/setup/local-dev.md) — guía detallada de entorno local
- [`.claude/CLAUDE.md`](.claude/CLAUDE.md) — contexto del proyecto para agentes IA

## Convenciones

- Commits: [Conventional Commits](https://www.conventionalcommits.org/) en español
  (`feat(alumnos): agregar endpoint de búsqueda por RUT`)
- Branches: `main` → `develop` → `feature/*` | `fix/*` | `chore/*`
- Capa backend: `routes → services → repositories → models`
- Frontend: Server Components por defecto, Client solo cuando es necesario
# minfra-kiro
