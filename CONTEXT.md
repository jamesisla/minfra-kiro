# 🗺️ MInfra - Contexto del Proyecto (v3.0.0)

Documento de contexto general para continuar el desarrollo del proyecto **MInfra (CAD & Facility Management)** en un nuevo equipo o entorno.

---

## 📌 1. Visión General del Proyecto
**MInfra** es una plataforma web para la gestión de infraestructura física y planos CAD/DXF. Permite cargar planos de edificación en formato DXF, procesarlos automáticamente en el backend, renderizarlos de forma vectorial (SVG) de ultra-alta fidelidad en el frontend, e interactuar con recintos (salas, oficinas, laboratorios) y capas arquitectónicas.

---

## 🏗️ 2. Estructura de la Monorepo

```
c:/CODEA/FM/
├── apps/
│   ├── web/                     # Frontend Next.js (React, TailwindCSS, TypeScript)
│   │   ├── components/
│   │   │   └── infrastructure/
│   │   │       └── dxf-viewer.tsx  # Visor SVG interactivo (Zoom, Pan, Auto-fit, Capas)
│   │   └── package.json         # Version 3.0.0
│   └── api/                     # Backend FastAPI (Python)
│       ├── app/
│       │   ├── main.py          # FastAPI app entrypoint (v3.0.0)
│       │   └── services/
│       │       └── dxf_processor.py # Procesador CAD (ezdxf, bounds IQR, raycasting)
│       └── pyproject.toml       # Version 3.0.0
├── packages/
│   └── shared-types/            # Tipos compartidos TypeScript (v3.0.0)
├── CONTEXT.md                   # Este documento
└── package.json                 # Monorepo root (v3.0.0)
```

---

## ⚙️ 3. Componentes Clave e Implementaciones Clave (v3.0.0)

### 🔹 Backend: `apps/api/app/services/dxf_processor.py`
1. **Límites Inteligentes y Reducción del Área Blanca (`_calculate_smart_bounds`):**
   - Usa el método IQR (Rango Intercuartílico) para descartar ruido distante u objetos huérfanos fuera del plano real.
   - Aplica un **margen hiper-ajustado del 0.5%** sobre las dimensiones del piso para minimizar el área blanca y maximizar la visibilidad.
2. **Inferencia Inteligente de Recintos (`_infer_room_type_from_text`):**
   - Reconoce automáticamente códigos de salas tipo `A201` a `A229`, `B101`, etc., y palabras clave (`SALA`, `OFICINA`, `LABORATORIO`, `BAÑO`, `PASILLO`, `DEPOSITO`, `ESCALERA`, `ASCENSOR`).
3. **Asociación Espacial al Polígono de Menor Área (*Innermost Polygon*):**
   - Asigna los textos de recintos al **polígono contenedor más pequeño**, evitando que el contorno gigante del piso capture etiquetas de salas interiores.
4. **Auto-Cerrado de Políneas por Proximidad:**
   - Detecta polilíneas casi cerradas (extremos a menos de 2m o 2% del ancho) y las cierra automáticamente para calcular área en m².
5. **Reconstrucción Espacial de Salas por Raycasting (`_find_room_box_from_walls`):**
   - Si una sala (ej. `A202, A203, A210`) no posee un polígono cerrado en el DXF porque fue dibujada con líneas sueltas o aberturas de puertas, lanza rayos horizontales y verticales hacia los muros circundantes para reconstruir el recinto exacto.
6. **Ordenamiento de Renderizado SVG:**
   - Renderiza polígonos ordenados por **área descendente** (perímetros grandes al fondo con `pointer-events="stroke"`, recintos pequeños arriba), garantizando clics 100% precisos sobre las salas.

### 🔹 Frontend: `apps/web/components/infrastructure/dxf-viewer.tsx`
1. **Centrado e Auto-Fit Inmediato:**
   - Ajusta automáticamente el plano al 95% del visor apenas se carga o guarda un nuevo piso.
   - Utiliza `ResizeObserver` para recalcular el centro cuando se redimensiona la ventana o los paneles laterales.
2. **Interacción y Capas:**
   - Soporta Pan (arrastre), Zoom (rueda y botones), selección interactiva de recintos y conmutación de visibilidad de capas.
   - Aplica `vector-effect="non-scaling-stroke"` para mantener trazos ultrafinos constantes independientemente del nivel de zoom.

---

## 🚀 4. Guía de Inicio Rápido en un Nuevo Equipo

### 1️⃣ Clonar el Repositorio
```bash
git clone https://github.com/jamesisla/minfra-kiro.git
cd minfra-kiro
```

### 2️⃣ Levantar el Backend (`apps/api`)
```bash
cd apps/api
python -m venv venv

# En Windows PowerShell:
.\venv\Scripts\Activate.ps1

# En Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt  # O instala: ezdxf fastapi uvicorn pydantic
uvicorn app.main:app --reload --port 8000
```
*API Swagger disponible en:* `http://localhost:8000/docs`

### 3️⃣ Levantar el Frontend (`apps/web`)
```bash
cd apps/web
npm install
npm run dev
```
*Aplicación Web disponible en:* `http://localhost:3000`

---

## 🏷️ 5. Control de Versiones y Tagging
- **Versión Actual:** `v3.0.0`
- **Rama principal:** `main`
- **Git Tag:** `v3.0.0`
