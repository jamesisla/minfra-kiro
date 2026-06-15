# Contrato de API (v1)

> Mantener sincronizado con `apps/api/app/api/v1/routes/` y
> `packages/shared-types/`. La fuente de verdad es el código;
> este documento es un resumen navegable.

Swagger interactivo disponible en: `http://localhost:8000/docs`

## Autenticación

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Registra un nuevo usuario | No |
| POST | `/api/v1/auth/login` | Login, retorna JWT | No |

## Usuarios

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/api/v1/users/me` | Usuario autenticado actual | Sí |
| GET | `/api/v1/users` | Lista paginada de usuarios | Sí |
| GET | `/api/v1/users/{id}` | Detalle de usuario | Sí |
| PATCH | `/api/v1/users/{id}` | Actualización parcial | Sí |
| DELETE | `/api/v1/users/{id}` | Soft delete | Sí |

## Health

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/api/v1/health` | Healthcheck de la API | No |

---

## Cómo agregar un nuevo recurso

1. **Modelo**: `apps/api/app/models/<entidad>.py` (heredar `Base, TimestampMixin`)
2. **Schema**: `apps/api/app/schemas/<entidad>.py` (Base/Create/Update/Read)
3. **Repositorio**: `apps/api/app/repositories/<entidad>.py` (heredar `BaseRepository`)
4. **Servicio**: `apps/api/app/services/<entidad>_service.py`
5. **Router**: `apps/api/app/api/v1/routes/<entidad>.py` + registrar en `router.py`
6. **Migración**: `alembic revision --autogenerate -m "crear_tabla_<entidad>"`
7. **Tipos frontend**: `packages/shared-types/src/entities/<entidad>.ts`
8. **Tests**: `apps/api/tests/unit/` y/o `integration/`
9. Actualizar esta tabla y `docs/ai-context/data-model.md`
