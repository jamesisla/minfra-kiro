# 🗺️ MInfra — Contexto Maestro del Proyecto & Continuidad de Sesión

> **Documento de Contexto y Continuidad:** Lee este archivo para retomar el desarrollo de **MInfra** sin pérdida de contexto ni configuración.

---

## 📌 1. Visión y Estado del Proyecto
* **Proyecto:** **MInfra (CAD, Space Management & Facility Management Universitario)**
* **Versión Actual:** `v4.3.0`
* **Rama Principal:** `main` (Sincronizada con GitHub: `https://github.com/jamesisla/minfra-kiro.git`)
* **Entorno de Despliegue:** Instancia **Oracle Cloud Infrastructure (OCI) e3micro** (Ubuntu Minimal, 1 vCPU, 1 GB RAM + 2GB Swap).

---

## 🏗️ 2. Estructura del Monorepo

```
minfra-kiro/
├── apps/
│   ├── web/                     # Frontend Next.js 14 (App Router, Tailwind, Zustand)
│   │   ├── app/                 # Páginas (Login con 1-click demo, Dashboard, Visor CAD, Compliance)
│   │   ├── components/          # dxf-viewer.tsx, item-info-popup.tsx (Tabs: Espacio, Personas, Bienes, Docs), compliance-view.tsx, pdf-preview-modal.tsx
│   │   └── next.config.js       # Proxy interno rewrites (/api/:path* -> http://127.0.0.1:8000)
│   └── api/                     # Backend FastAPI (Python 3.12, AsyncPG, Alembic, ezdxf)
│       ├── app/
│       │   ├── api/v1/routes/   # auth, infrastructure, organizations, people, spaces, assets, documents
│       │   ├── models/          # user, organization, person, infrastructure, asset, document
│       │   ├── repositories/    # Repositorios base y especializados con soft delete
│       │   ├── schemas/         # Modelos Pydantic v2 (asset, document, space, person, etc.)
│       │   └── services/        # dxf_processor, infrastructure, organization, person, space, asset, document_service
│       └── alembic/versions/    # Migraciones 0001 a 0005
├── packages/
│   └── shared-types/            # Tipos compartidos TypeScript (User, Espacio, Persona, Bien, Documento, etc.)
├── docs/
│   ├── architecture/            # roadmap-fases-modulos.md (Plan estratégico completo)
│   ├── ai-context/              # data-model.md (Diccionario ERD)
│   └── setup/                   # production-deploy.md (Guía para OCI)
├── scripts/
│   └── deploy.sh                # Script de despliegue automático 1-comando en OCI
└── CONTEXT.md                   # Este documento maestro
```

---

## 📦 3. Módulos Implementados

### ✅ Módulo 0: Space Management & Motor CAD
- **Jerarquía:** `Sede` $\rightarrow$ `Edificio` $\rightarrow$ `Piso` $\rightarrow$ `Espacio` (Negocio persistente) $\rightarrow$ `PlanoItem` (Geometría SVG).
- **Procesamiento CAD (`dxf_processor.py`):** Ingesta DXF, límites IQR, raycasting para salas abiertas, cálculo de $\text{m}^2$ y metros lineales.
- **Visor Interactivo (`dxf-viewer.tsx`):** Zoom, Pan, giro de planos (90°/180°/270°), modos visuales y control de capas.
- **Desacoplamiento Geometría/Negocio:** La re-subida de planos DXF no elimina los datos asociados al `Espacio`.

### ✅ Módulo 1 (Fase 1): Personas & Unidades Organizacionales
- **`UnidadOrganizacional`:** Jerarquía institucional (Facultades, Departamentos, Escuelas).
- **`Persona`:** Directorio de docentes, administrativos, estudiantes y externos.
- **`EspacioPersona`:** Asignación de roles a cada sala (`RESPONSABLE`, `OCUPANTE`, `BRIGADISTA`).
- **Popup Interactivo:** Pestaña "Personas" para ver y asignar personal en vivo desde el plano.

### ✅ Módulo 2 (Fase 2): Bienes & Activos Fijos Geolocalizados
- **`Bien`:** Inventario de activos con `codigo_patrimonial` (QR/Barcode), categoría (*Mobiliario, Computación/TI, Climatización HVAC, Laboratorio, Audiovisual, Seguridad*), marca, modelo, serie y estado operativo.
- **`BienMovimiento`:** Trazabilidad y auditoría de traslados de bienes entre recintos.
- **Popup Interactivo:** Pestaña "Bienes" para ver y dar de alta equipamiento directamente en la sala.

### ✅ Módulo 3 (Fase 3): Documentos & Cumplimiento Normativo (Compliance)
- **`Documento`:** Repositorio documental multinivel (Sede, Edificio, Piso, Recinto, Bien).
- **Tipos & Categorías:** Certificados SEC (Gas, Electricidad, Ascensores), Permisos Municipales de Edificación, Títulos de Dominio, Pólizas de Seguro contra Incendios/Sismos, Protocolos de Bioseguridad, Manuales/Garantías y Planos Técnicos.
- **Semáforo de Vigencias:** Cálculo automático de estados de vigencia (`VIGENTE`, `POR_VENCER_60`, `POR_VENCER_30`, `VENCIDO`, `SIN_VENCIMIENTO`).
- **Visor Rápido de PDF Embebido (`pdf-preview-modal.tsx`):** Previsualización en tiempo real sin descargar archivos.
- **Panel Institucional de Compliance (`compliance-view.tsx`):** Matriz de control para acreditaciones CNA/ISO, alertas críticas y filtros por organismo emisor.

### ✅ Acceso Rápido & Conectividad OCI
- **Login 1-Click Demo:** Botones directos `⚡ Admin Demo` (`admin@institucion.cl` / `Admin123!`) y `👤 Alumno Demo`.
- **Doble Proxy:** `next.config.js` reenvía `/api/...` a FastAPI en `127.0.0.1:8000` para prevenir errores 502.

---

## 🗄️ 4. Base de Datos y Migraciones Alembic

1. `0001_users_table.py`: Tabla `users` (autenticación JWT, bcrypt).
2. `0002_infrastructure_tables.py`: Tablas `sedes`, `edificios`, `pisos`, `plano_items`.
3. `0003_espacios_personas_unidades.py`: Tablas `unidades_organizacionales`, `personas`, `espacios`, `espacio_personas`.
4. `0004_bienes_activos.py`: Tablas `bienes` y `bien_movimientos`.
5. `0005_documentos_compliance.py`: Tabla `documentos` (Compliance, certificados y semáforos).

---

## 🖥️ 5. Despliegue en Servidor OCI

En el servidor remoto en OCI:
- **Backend:** Servicio Systemd `sdd-api.service` (`uvicorn app.main:app --port 8000`).
- **Frontend:** PM2 `minfra-web` (`npm start -- -p 3000`).
- **Reverse Proxy:** Nginx en puerto 80/443.
- **Actualizar todo en 1 comando:**
  ```bash
  cd /var/www/sdd-project
  bash scripts/deploy.sh
  ```

---

## 🚀 6. Próximo Paso en la Hoja de Ruta: FASE 4 (Facility Management 360° & Analytics)

Cuando se retome el proyecto, el siguiente desarrollo planificado es:
1. **Analytics 360° & Space Chargeback:**
   - Cruce integral de datos: Espacio + Personas + Bienes + Documentos de Compliance.
   - Mapas de calor (Heatmaps) en el visor CAD (densidad de ocupación, distribución de facultades, estado operativo de activos).
   - Métricas financieras de costo de ocupación ($\text{CLP}/m^2$) por unidad académica.
   - Generación de Dossier automático para procesos de Acreditación Institucional (CNA/ISO).

---

## 💡 Prompt para Retomar Sesión
> *"Hola, lee el archivo `CONTEXT.md` para retomar el proyecto MInfra v4.3.0. Estamos listos para comenzar con la Fase 4 (Analytics 360° & Facility Management)."*
