# Glosario del Dominio

> Este archivo ayuda a los agentes IA a entender la terminología
> específica del proyecto/institución. Completar al iniciar el
> proyecto y mantener actualizado.

## Plantilla de entrada

```
**Término**: Definición clara y breve.
- Sinónimos/variantes usadas en la institución: ...
- Campos relacionados en la BD: ...
```

## Ejemplo (sistema académico — reemplazar por el dominio real)

**Alumno (Estudiante)**: Persona matriculada en al menos una
carrera de la institución.
- Sinónimos: "estudiante", "matriculado"
- Campos: `rut`, `nombre`, `apellido`, `email`, `carrera_id`

**Período Académico**: Unidad de tiempo en la que se imparten
asignaturas (semestre, trimestre, módulo según la institución).
- Sinónimos: "semestre", "ciclo"
- Campos: `nombre`, `fecha_inicio`, `fecha_fin`, `activo`

**Sección**: Instancia específica de una asignatura en un período,
con un docente y horario asignado.
- Sinónimos: "curso", "grupo"
- Campos: `asignatura_id`, `docente_id`, `periodo_id`, `cupos`

**Matrícula**: Relación entre un alumno, una carrera y un período
académico, que habilita al alumno a inscribir secciones.

**Inscripción**: Relación entre un alumno y una sección específica.

**Nota / Calificación**: Evaluación numérica (escala 1.0–7.0 en
Chile) asociada a un alumno, una sección y una evaluación o
ponderador específico.

<!-- Agregar términos propios del proyecto debajo -->
