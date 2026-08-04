"use client";

/**
 * Visor SVG interactivo para planos DXF.
 * Permite pan, zoom y click en entidades para ver su información.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { useInfrastructureStore, type PlanoItem } from "@/lib/stores/infrastructure-store";
import { cn } from "@/lib/utils";

interface Transform {
  scale: number;
  translateX: number;
  translateY: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 20;
const ZOOM_STEP = 0.15;

export function DxfViewer() {
  const { activePiso, pisoLoading, pisoError, selectedItem, setSelectedItem, clearSelectedItem } =
    useInfrastructureStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Pan state
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Medir el contenedor y hacer fit real cuando cambia el piso
  useEffect(() => {
    if (!activePiso?.svg_data) return;

    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setContainerSize({ w: width, h: height });

      // Calcular escala para que el plano entre justo con un margen del 5%
      const svgW = (activePiso.max_x ?? 100) - (activePiso.min_x ?? 0);
      const svgH = (activePiso.max_y ?? 100) - (activePiso.min_y ?? 0);
      if (svgW <= 0 || svgH <= 0) return;

      const scaleX = (width * 0.95) / svgW;
      const scaleY = (height * 0.95) / svgH;
      const scale = Math.min(scaleX, scaleY);

      // Centrar en el contenedor
      const translateX = (width - svgW * scale) / 2;
      const translateY = (height - svgH * scale) / 2;

      setTransform({ scale, translateX, translateY });
    };

    // Pequeño delay para que el DOM esté listo
    const t = setTimeout(measure, 50);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePiso?.id]);

  const fitToContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el || !activePiso) return;
    const { width, height } = el.getBoundingClientRect();
    const svgW = (activePiso.max_x ?? 100) - (activePiso.min_x ?? 0);
    const svgH = (activePiso.max_y ?? 100) - (activePiso.min_y ?? 0);
    if (svgW <= 0 || svgH <= 0) return;
    const scale = Math.min((width * 0.95) / svgW, (height * 0.95) / svgH);
    setTransform({
      scale,
      translateX: (width - svgW * scale) / 2,
      translateY: (height - svgH * scale) / 2,
    });
  }, [activePiso]);

  // ── Pan ──────────────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    panStart.current = { x: e.clientX, y: e.clientY };
    setTransform((t) => ({
      ...t,
      translateX: t.translateX + dx,
      translateY: t.translateY + dy,
    }));
  }, []);

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // ── Zoom con rueda ───────────────────────────────────────────────────────

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY < 0 ? 1 + ZOOM_STEP : 1 - ZOOM_STEP;

    setTransform((t) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * delta));
      // Zoom centrado en el puntero del mouse
      const scaleRatio = newScale / t.scale;
      const newTranslateX = mouseX - scaleRatio * (mouseX - t.translateX);
      const newTranslateY = mouseY - scaleRatio * (mouseY - t.translateY);
      return { scale: newScale, translateX: newTranslateX, translateY: newTranslateY };
    });
  }, []);

  // ── Zoom botones ─────────────────────────────────────────────────────────

  const zoomIn = () =>
    setTransform((t) => ({
      ...t,
      scale: Math.min(MAX_SCALE, t.scale * (1 + ZOOM_STEP)),
    }));

  const zoomOut = () =>
    setTransform((t) => ({
      ...t,
      scale: Math.max(MIN_SCALE, t.scale * (1 - ZOOM_STEP)),
    }));

  // ── Click en entidad SVG ─────────────────────────────────────────────────

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as SVGElement;
      // Buscar el elemento más cercano con clase dxf-entity
      const entity = target.closest(".dxf-entity") as SVGElement | null;

      if (!entity) {
        clearSelectedItem();
        return;
      }

      const elemId = entity.getAttribute("id");
      const layerName = entity.getAttribute("data-layer") ?? "";
      const entityType = entity.getAttribute("data-tipo") ?? entity.getAttribute("data-type") ?? "";
      const textContent = entity.getAttribute("data-texto") ?? entity.textContent ?? "";

      // Quitar selección anterior
      svgWrapperRef.current
        ?.querySelectorAll(".dxf-entity.selected")
        .forEach((el) => el.classList.remove("selected"));
      entity.classList.add("selected");

      // Construir un PlanoItem sintético para el popup
      const item: PlanoItem = {
        id: elemId ?? "unknown",
        tipo: entityType,
        nombre: textContent || null,
        capa: layerName,
        x: null,
        y: null,
        ancho: null,
        alto: null,
        metadata_extra: null,
      };

      // Buscar el item real por svg_element exacto en metadata_extra o por id
      const realItem = activePiso?.items.find((i) => {
        if (elemId && i.id === elemId) return true;
        if (!i.metadata_extra || !elemId) return false;
        try {
          const meta = JSON.parse(i.metadata_extra);
          return meta.svg_element === elemId;
        } catch {
          return false;
        }
      });

      if (realItem) {
        setSelectedItem(
          { ...realItem, nombre: (realItem.nombre ?? textContent) || null },
          { x: e.clientX, y: e.clientY }
        );
      } else {
        setSelectedItem(item, { x: e.clientX, y: e.clientY });
      }
    },
    [activePiso, setSelectedItem, clearSelectedItem]
  );

  // ── Touch (mobile) ───────────────────────────────────────────────────────

  const lastTouchDistance = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      isPanning.current = true;
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDistance.current) {
        const ratio = dist / lastTouchDistance.current;
        setTransform((t) => ({
          ...t,
          scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * ratio)),
        }));
      }
      lastTouchDistance.current = dist;
    } else if (e.touches.length === 1 && isPanning.current) {
      const dx2 = e.touches[0].clientX - panStart.current.x;
      const dy2 = e.touches[0].clientY - panStart.current.y;
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setTransform((t) => ({
        ...t,
        translateX: t.translateX + dx2,
        translateY: t.translateY + dy2,
      }));
    }
  };

  const onTouchEnd = () => {
    isPanning.current = false;
    lastTouchDistance.current = null;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (pisoLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Cargando plano…</p>
        </div>
      </div>
    );
  }

  if (pisoError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-destructive max-w-xs p-4 border border-destructive/20 rounded-xl bg-destructive/5">
          <p className="text-sm font-semibold">Error al cargar el piso</p>
          <p className="text-xs mt-1 opacity-80">{pisoError}</p>
        </div>
      </div>
    );
  }

  if (!activePiso) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground max-w-xs">
          <Map className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Selecciona un piso para ver el plano</p>
          <p className="text-xs mt-1 opacity-70">
            Navega por la estructura en el panel izquierdo
          </p>
        </div>
      </div>
    );
  }

  if (!activePiso.svg_data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground max-w-xs">
          <FileIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {activePiso.nombre ?? `Piso ${activePiso.numero}`}
          </p>
          <p className="text-xs mt-1 opacity-70">
            Este piso aún no tiene un plano DXF cargado.
            <br />
            Usa el botón <UploadIcon className="inline w-3 h-3" /> junto al piso en el panel
            izquierdo para subir un archivo .dxf
          </p>
        </div>
      </div>
    );
  }

  const cssTransform = `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Toolbar visor */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <button
          onClick={zoomIn}
          className="w-8 h-8 bg-card border border-border rounded-md flex items-center justify-center text-foreground hover:bg-secondary transition-colors shadow-sm"
          title="Acercar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="w-8 h-8 bg-card border border-border rounded-md flex items-center justify-center text-foreground hover:bg-secondary transition-colors shadow-sm"
          title="Alejar"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={fitToContainer}
          className="w-8 h-8 bg-card border border-border rounded-md flex items-center justify-center text-foreground hover:bg-secondary transition-colors shadow-sm"
          title="Ajustar a la pantalla"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTransform({ scale: 1, translateX: 0, translateY: 0 })}
          className="w-8 h-8 bg-card border border-border rounded-md flex items-center justify-center text-foreground hover:bg-secondary transition-colors shadow-sm"
          title="Restablecer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Info de escala */}
      <div className="absolute bottom-3 right-3 z-20 bg-card/80 border border-border rounded px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
        {Math.round(transform.scale * 100)}%
      </div>

      {/* Info del piso activo */}
      <div className="absolute top-3 left-3 z-20 bg-card/80 border border-border rounded px-3 py-1.5 text-xs backdrop-blur-sm">
        <span className="font-medium">
          {activePiso.nombre ?? `Piso ${activePiso.numero}`}
        </span>
        {activePiso.archivo_dxf && (
          <span className="ml-2 text-muted-foreground">{activePiso.archivo_dxf}</span>
        )}
        {activePiso.items.length > 0 && (
          <span className="ml-2 text-muted-foreground">
            · {activePiso.items.length} entidades
          </span>
        )}
      </div>

      {/* Leyenda de capas */}
      <LayerLegend items={activePiso.items} />

      {/* Área del visor */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-hidden dxf-viewer bg-muted/20 relative",
          selectedItem ? "cursor-default" : ""
        )}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleSvgClick}
      >
        <div
          ref={svgWrapperRef}
          style={{
            transform: cssTransform,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
            width: containerSize.w || "100%",
            height: containerSize.h || "100%",
          }}
          dangerouslySetInnerHTML={{ __html: activePiso.svg_data }}
        />
      </div>
    </div>
  );
}

// ── Iconos inline ─────────────────────────────────────────────────────────

function Map({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-10.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

// ── Leyenda de capas ──────────────────────────────────────────────────────────

const LEGEND_COLORS: Record<string, string> = {
  PARED:           "#1e293b",
  COLUMNA:         "#94a3b8",
  AREA:            "#f1f5f9",
  SALA:            "#dbeafe",
  LABORATORIO:     "#d1fae5",
  OFICINA:         "#fef3c7",
  BAÑO:            "#e0e7ff",
  PASILLO:         "#f3f4f6",
  ESCALERA:        "#fce7f3",
  ASCENSOR:        "#ede9fe",
  SALA_SERVIDORES: "#fee2e2",
  DEPOSITO:        "#fef9c3",
  COMEDOR:         "#ffedd5",
  CAFETERIA:       "#ffedd5",
  BIBLIOTECA:      "#cffafe",
  AUDITORIO:       "#f0fdf4",
  SALA_REUNION:    "#fdf4ff",
  CARPINTERIA:     "#fed7aa",
  VENTANA:         "#bae6fd",
  MOBILIARIO:      "#e2e8f0",
  EQUIPO:          "#fde68a",
  TEXTO:           "#e2e8f0",
  DEFAULT:         "#f1f5f9",
};

const LEGEND_BORDER: Record<string, string> = {
  PARED: "#1e293b", SALA: "#93c5fd", LABORATORIO: "#6ee7b7",
  OFICINA: "#fcd34d", BAÑO: "#a5b4fc", ESCALERA: "#f9a8d4",
  ASCENSOR: "#c4b5fd", CARPINTERIA: "#fb923c", DEFAULT: "#94a3b8",
};

const TYPE_LABELS_SHORT: Record<string, string> = {
  PARED: "Muros", COLUMNA: "Columnas", AREA: "Áreas", SALA: "Salas",
  LABORATORIO: "Labs", OFICINA: "Oficinas", BAÑO: "Baños", PASILLO: "Pasillos",
  ESCALERA: "Escaleras", ASCENSOR: "Ascensores", SALA_SERVIDORES: "Servidores",
  DEPOSITO: "Depósitos", COMEDOR: "Comedor", CAFETERIA: "Cafetería",
  BIBLIOTECA: "Biblioteca", AUDITORIO: "Auditorio", SALA_REUNION: "Reuniones",
  CARPINTERIA: "Puertas/Ventanas", MOBILIARIO: "Mobiliario", EQUIPO: "Equipos",
  TEXTO: "Textos", DEFAULT: "General",
};

function LayerLegend({ items }: { items: import("@/lib/stores/infrastructure-store").PlanoItem[] }) {
  const [open, setOpen] = useState(true);

  // Contar tipos únicos presentes (excluir TEXTO y DEFAULT si son muchos)
  const typeCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.tipo] = (acc[item.tipo] ?? 0) + 1;
    return acc;
  }, {});

  const types = Object.entries(typeCounts)
    .filter(([t]) => t !== "COTA")
    .sort((a, b) => b[1] - a[1]);

  if (types.length === 0) return null;

  return (
    <div className="absolute bottom-10 left-3 z-20 bg-card/90 border border-border rounded-lg shadow-lg backdrop-blur-sm max-w-[200px]">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-secondary/50 transition-colors rounded-lg"
      >
        <span>Capas</span>
        <span className="text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-0.5 max-h-64 overflow-y-auto">
          {types.map(([tipo, count]) => (
            <div key={tipo} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-secondary/30 transition-colors">
              <span
                className="w-3 h-3 rounded-sm shrink-0 border"
                style={{
                  background: LEGEND_COLORS[tipo] ?? LEGEND_COLORS.DEFAULT,
                  borderColor: LEGEND_BORDER[tipo] ?? LEGEND_BORDER.DEFAULT,
                }}
              />
              <span className="text-xs text-foreground flex-1 truncate">
                {TYPE_LABELS_SHORT[tipo] ?? tipo}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
