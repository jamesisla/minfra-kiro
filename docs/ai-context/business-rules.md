# Reglas de Negocio

> Documenta aquí reglas que la IA debe conocer ANTES de generar
> lógica de servicios. Reglas no documentadas tienden a ser
> "olvidadas" por agentes IA en sesiones nuevas.

## Plantilla de entrada

```
### RN-XXX: Nombre de la regla
- **Aplica a**: [entidad/proceso]
- **Regla**: descripción precisa
- **Excepciones**: si existen
- **Validación**: dónde se implementa (servicio/schema)
```

## Ejemplos (sistema académico — reemplazar por reglas reales)

### RN-001: Escala de notas chilena
- **Aplica a**: Calificaciones
- **Regla**: las notas van de 1.0 a 7.0, con un decimal. La nota
  mínima de aprobación es 4.0 (configurable por institución).
- **Validación**: `schemas/grade.py` con `Field(ge=1.0, le=7.0)`

### RN-002: Asistencia mínima MINEDUC
- **Aplica a**: Inscripciones / Asistencia
- **Regla**: un alumno requiere ≥75% de asistencia para tener
  derecho a evaluación final en una sección, salvo justificativos
  médicos documentados.
- **Excepciones**: certificados médicos registrados por la unidad
  de bienestar estudiantil.
- **Validación**: `services/enrollment_service.py`

### RN-003: Validación de RUT chileno
- **Aplica a**: Alumnos, Docentes, cualquier persona natural
- **Regla**: todo RUT debe validarse con su dígito verificador
  antes de persistir.
- **Validación**: usar `validar_rut()` (ver
  `docs/ai-context/` → snippets de utilidades Chile, o
  `packages/shared-types` si se porta a TS)

<!-- Agregar reglas propias del proyecto debajo -->
