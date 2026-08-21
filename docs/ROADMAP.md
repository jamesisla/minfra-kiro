# 🗺️ MInfra - Roadmap Estratégico & Análisis de Funcionalidades FM (Facility Management)

## 📌 Visión General
Transformar **MInfra** en un sistema **CAFM/IWMS (Computer-Aided Facility Management)** especializado para educación superior y redes multisede. Combina la potencia del modelo de información geográfica/CAD (DXF/SVG) con los estándares internacionales de Facility Management (ISO 41001, IFMA).

---

## 🏛️ Análisis de Funcionalidades de Sistemas FM Aplicadas a la Universidad

| Módulo FM Tradicional | Aplicación e Impacto en la Universidad | Nivel de Prioridad |
| :--- | :--- | :---: |
| **1. Space Management & Organizaciones** | **Jerarquía y Desacoplamiento CAD:** Control de Sedes, Edificios, Pisos y Espacios persistentes con vinculación de Unidades Organizacionales (Facultades/Departamentos). | **Alta** (Fase 1) |
| **2. People & Occupancy Management** | **Personas y Responsables:** Asignación de puestos, custodios de recinto, líderes de emergencia y control de aforos/ocupación. | **Alta** (Fase 1) |
| **3. Asset Tracking & QR Geolocalizado** | **Inventario de Bienes en SVG:** Control de mobiliario, equipos TI, climatización y laboratorios con trazabilidad y códigos QR. | **Alta** (Fase 2) |
| **4. Document Management & Compliance** | **Expedientes de Infraestructura:** Títulos, permisos de edificación, certificados SEC de ascensores/gases, manuales y pólizas con alertas de vencimiento. | **Alta** (Fase 3) |
| **5. Space Allocation & Chargeback** | **Imputación de $m^2$ por Facultad/Carrera:** Distribución del costo operativo inmobiliario ($/m²) según los metros que ocupa cada Facultad. | **Media** (Fase 4) |
| **6. Compliance & Acreditación Institucional** | **Dossier Automático de Acreditación:** Generación de reportes de metros por alumno, capacidad de laboratorios y aforos exigidos (CNA/ISO). | **Alta** (Fase 4) |

---

## 🗓️ Hoja de Ruta de Módulos

```mermaid
graph TD
    subgraph Fase1 ["Fase 1: Núcleo Espacial & Personas"]
        F1_1["Entidad Espacio permanente desacoplada de DXF"]
        F1_2["Unidades Organizacionales (Facultades/Departamentos)"]
        F1_3["Personas y Roles de Asignación (Responsable, Ocupante, Brigadista)"]
        F1_4["Pestaña 'Personas' en Popup de Recinto y Búsqueda de Personal"]
    end

    subgraph Fase2 ["Fase 2: Bienes / Activos Fijos"]
        F2_1["Catálogo de Bienes (Código Patrimonial, Marca, Modelo, Serie, Estado)"]
        F2_2["Geolocalización en SVG (Pines interactivos y Drag&Drop)"]
        F2_3["Etiquetado y lectura con Códigos QR"]
        F2_4["Trazabilidad e historial de traslados entre recintos"]
    end

    subgraph Fase3 ["Fase 3: Documentos & Compliance"]
        F3_1["Almacenamiento y categorización de archivos multi-nivel"]
        F3_2["Control de vigencias y alertas de expiración (SEC, Incendio, Permisos)"]
        F3_3["Visor integrado de PDF/planos técnicos en el visor CAD"]
    end

    subgraph Fase4 ["Fase 4: Analytics 360° & Facility Management"]
        F4_1["Dossier automático de acreditación institucional"]
        F4_2["Heatmaps temáticos en plano (Densidad, Ocupación, Facultad)"]
        F4_3["Métricas de Space Chargeback ($/m² por unidad)"]
    end

    Fase1 --> Fase2
    Fase2 --> Fase3
    Fase3 --> Fase4
```

---

## 📑 Documento Detallado de Arquitectura
Para consultar el detalle de modelos, tablas y consideraciones de despliegue en OCI e3micro (Ubuntu minimal), ver:
[`docs/architecture/roadmap-fases-modulos.md`](docs/architecture/roadmap-fases-modulos.md).
