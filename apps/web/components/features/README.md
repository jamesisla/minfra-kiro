# Componentes de Dominio (Features)

Coloca aquí los componentes específicos del dominio del proyecto,
organizados por feature/módulo. Ejemplo para un sistema académico:

```
components/features/
├── students/
│   ├── student-card.tsx
│   ├── student-list.tsx
│   └── student-form.tsx
├── courses/
│   ├── course-card.tsx
│   └── enrollment-button.tsx
└── grades/
    └── grade-table.tsx
```

Convención: cada componente es un Server Component por defecto.
Si necesita interactividad (estado, eventos), agrega `"use client"`
al inicio del archivo.
