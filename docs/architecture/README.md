# Arquitectura del Proyecto

## Visión General

```
┌─────────────────┐      HTTP/JSON       ┌──────────────────┐
│   Next.js Web    │ ───────────────────► │   FastAPI API     │
│  (apps/web)      │ ◄─────────────────── │   (apps/api)      │
│  Puerto 3000     │                       │   Puerto 8000     │
└─────────────────┘                       └─────────┬─────────┘
                                                       │
                                            ┌──────────▼─────────┐
                                            │   PostgreSQL 16     │
                                            │   Puerto 5432       │
                                            └─────────────────────┘

         Tipos compartidos: packages/shared-types
```

## Decisiones de Arquitectura (ADR)

Registra aquí las decisiones importantes con el formato:
**Contexto → Decisión → Consecuencias**

### ADR-001: Monorepo con Turborepo + pnpm

- **Contexto**: el proyecto tiene frontend, backend y tipos
  compartidos que evolucionan juntos.
- **Decisión**: usar un monorepo con pnpm workspaces + Turborepo
  para cache de builds.
- **Consecuencias**: un solo `git clone`, tipos compartidos sin
  publicar paquetes npm, pero requiere que todos los devs usen pnpm.

### ADR-002: Soft delete en todas las tablas

- **Contexto**: en sistemas académicos, eliminar registros
  (alumnos, notas) puede tener implicancias legales/auditoría.
- **Decisión**: ninguna tabla usa `DELETE` físico; se usa
  `deleted_at` (columna nullable de timestamp).
- **Consecuencias**: todas las queries deben filtrar
  `deleted_at IS NULL` (lo hace `BaseRepository` automáticamente).
  Requiere job de limpieza/archivado si el volumen crece mucho.

### ADR-003: Autenticación JWT propia (no Supabase Auth por defecto)

- **Contexto**: para mantener el ejemplo autocontenido y sin
  dependencias externas obligatorias.
- **Decisión**: JWT propio con `python-jose` + `passlib`.
- **Consecuencias**: si la institución usa SSO (Google Workspace,
  Azure AD), reemplazar `core/security.py` y `routes/auth.py` por
  un flujo OAuth2/OIDC. Considerar Supabase Auth o NextAuth como
  alternativas si se requiere SSO rápido.

<!-- Agregar nuevos ADRs aquí, con numeración incremental -->
