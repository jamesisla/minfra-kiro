# Modelo de Datos (v4.2.0)

> Mantener sincronizado con `apps/api/app/models/`. Cada tabla
> nueva debe agregarse aquí con su propósito y relaciones.

## Convenciones generales

- Toda tabla tiene: `id (UUID)`, `created_at`, `updated_at`,
  `deleted_at` (vía `TimestampMixin`).
- Soft delete: filtrar siempre `deleted_at IS NULL`
  (lo hace `BaseRepository` automáticamente).

---

## Tablas Actuales

### 1. `sedes`
Campus o sedes universitarias/institucionales.

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| nombre | String(255) | Requerido |
| descripcion | Text | Opcional |
| direccion | String(500) | Opcional |

### 2. `edificios`
Edificaciones dentro de una sede.

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| nombre | String(255) | Requerido |
| codigo | String(50) | Opcional |
| sede_id | UUID | FK -> `sedes.id` (CASCADE) |

### 3. `pisos`
Niveles de un edificio con plano arquitectónico DXF/SVG.

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| numero | Integer | Requerido |
| nombre | String(255) | Opcional |
| edificio_id | UUID | FK -> `edificios.id` (CASCADE) |
| archivo_dxf | String(500) | Nombre archivo DXF original |
| svg_data | Text | SVG generado para renderizado |
| min_x, min_y, max_x, max_y | Float | Bounds espaciales del plano |

### 4. `espacios` (Fase 1)
Entidad persistente de negocio para recintos (salas, oficinas, labs). Desacoplada de la geometría CAD.

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| piso_id | UUID | FK -> `pisos.id` (CASCADE) |
| codigo | String(100) | Requerido, indexado (ej: A204) |
| nombre | String(255) | Opcional |
| tipo | String(100) | SALA, OFICINA, LABORATORIO, etc. |
| estado | String(50) | Disponible, Ocupado, Mantenimiento, Reservado |
| capacidad | Integer | Aforo máximo de personas |
| area_m2 | Float | Superficie calculada o declarada |
| perimetro_m | Float | Perímetro en metros |
| unidad_id | UUID | FK -> `unidades_organizacionales.id` |
| metadata_extra | Text | JSON para atributos custom |

### 5. `plano_items`
Entidades geométricas vectoriales parseadas del DXF.

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| piso_id | UUID | FK -> `pisos.id` (CASCADE) |
| espacio_id | UUID | FK -> `espacios.id` (SET NULL) |
| tipo | String(100) | Tipo CAD |
| nombre | String(500) | Etiqueta de texto |
| capa | String(255) | Capa DXF de origen |
| x, y, ancho, alto | Float | Coordenadas bounding box |
| metadata_extra | Text | Metadata del procesador CAD |

### 6. `unidades_organizacionales` (Fase 1)
Organigrama institucional (Facultades, Escuelas, Departamentos).

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| nombre | String(255) | Requerido |
| codigo | String(50) | Opcional, indexado (ej: FING) |
| tipo | String(100) | FACULTAD, DEPARTAMENTO, DIRECCION, etc. |
| parent_id | UUID | FK -> `unidades_organizacionales.id` |

### 7. `personas` (Fase 1)
Docentes, administrativos, estudiantes y personal externo.

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| nombre_completo | String(255) | Requerido |
| rut_dni | String(50) | Opcional, indexado |
| email | String(255) | Opcional, indexado |
| telefono | String(50) | Opcional |
| cargo | String(255) | Opcional |
| tipo | String(50) | DOCENTE, ADMINISTRATIVO, ESTUDIANTE, EXTERNO |
| unidad_id | UUID | FK -> `unidades_organizacionales.id` |
| user_id | UUID | FK -> `users.id` (Opcional) |

### 8. `espacio_personas` (Fase 1)
Vínculo entre Espacio y Persona (Ocupante, Responsable, Brigadista).

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| espacio_id | UUID | FK -> `espacios.id` (CASCADE) |
| persona_id | UUID | FK -> `personas.id` (CASCADE) |
| rol | String(50) | RESPONSABLE, OCUPANTE, BRIGADISTA, CONTACTO |
| puesto_identificador | String(100) | Opcional (ej: Puesto 03) |
| fecha_inicio, fecha_fin | DateTime | Vigencia de la asignación |

### 9. `users`
Autenticación y usuarios del sistema.

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| email | String(255) | Único, indexado |
| hashed_password | String(255) | Bcrypt |
| full_name | String(255) | |
| is_active | Boolean | Default true |
| is_superuser | Boolean | Default false |

---

## Diagrama Entidad-Relación

```mermaid
erDiagram
    SEDES ||--o{ EDIFICIOS : contiene
    EDIFICIOS ||--o{ PISOS : contiene
    PISOS ||--o{ ESPACIOS : organiza
    PISOS ||--o{ PLANO_ITEMS : contiene_geometria
    ESPACIOS ||--o| PLANO_ITEMS : asocia_geometria

    UNIDADES_ORGANIZACIONALES ||--o{ UNIDADES_ORGANIZACIONALES : subunidades
    UNIDADES_ORGANIZACIONALES ||--o{ PERSONAS : pertenece
    UNIDADES_ORGANIZACIONALES ||--o{ ESPACIOS : asignado_a

    ESPACIOS ||--o{ ESPACIO_PERSONAS : asignaciones
    PERSONAS ||--o{ ESPACIO_PERSONAS : asignaciones
    USERS ||--o| PERSONAS : cuenta_usuario
```
