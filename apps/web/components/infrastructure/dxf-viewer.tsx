"use client";

/**
 * Visor SVG interactivo para planos DXF.
 * Permite pan, zoom y click en entidades para ver su información.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, RotateCw, Eye, EyeOff, Layers, Palette, Paintbrush, Sparkles } from "lucide-react";
import { useInfrastructureStore, type PlanoItem } from "@/lib/stores/infrastructure-store";
import { cn } from "@/lib/utils";

export type DisplayMode = "colored-shaded" | "colored-lines" | "monochrome";

export const COLOR_PALETTE: Record<string, { fill: string; stroke: string }> = {
  PARED:           { fill: "transparent", stroke: "#475569" },
  COLUMNA:         { fill: "transparent", stroke: "#64748b" },
  AREA:            { fill: "rgba(56, 189, 248, 0.14)", stroke: "#0284c7" },
  SALA:            { fill: "rgba(59, 130, 246, 0.18)", stroke: "#2563eb" },
  LABORATORIO:     { fill: "rgba(16, 185, 129, 0.18)", stroke: "#059669" },
  OFICINA:         { fill: "rgba(245, 158, 11, 0.18)", stroke: "#d97706" },
  BAÑO:            { fill: "rgba(99, 102, 241, 0.18)", stroke: "#4f46e5" },
  PASILLO:         { fill: "rgba(148, 163, 184, 0.14)", stroke: "#64748b" },
  ESCALERA:        { fill: "rgba(236, 72, 153, 0.18)", stroke: "#db2777" },
  ASCENSOR:        { fill: "rgba(139, 92, 246, 0.18)", stroke: "#7c3aed" },
  SALA_SERVIDORES: { fill: "rgba(239, 68, 68, 0.18)", stroke: "#dc2626" },
  DEPOSITO:        { fill: "rgba(234, 179, 8, 0.18)", stroke: "#ca8a04" },
  COMEDOR:         { fill: "rgba(249, 115, 22, 0.18)", stroke: "#ea580c" },
  CAFETERIA:       { fill: "rgba(249, 115, 22, 0.18)", stroke: "#ea580c" },
  BIBLIOTECA:      { fill: "rgba(6, 182, 212, 0.18)", stroke: "#0891b2" },
  AUDITORIO:       { fill: "rgba(34, 197, 94, 0.18)", stroke: "#16a34a" },
  SALA_REUNION:    { fill: "rgba(217, 70, 239, 0.18)", stroke: "#c026d3" },
  CARPINTERIA:     { fill: "transparent", stroke: "#ea580c" },
  VENTANA:         { fill: "transparent", stroke: "#0284c7" },
  MOBILIARIO:      { fill: "transparent", stroke: "#64748b" },
  EQUIPO:          { fill: "transparent", stroke: "#d97706" },
  TEXTO:           { fill: "#0ea5e9", stroke: "#0ea5e9" },
  DEFAULT:         { fill: "rgba(59, 130, 246, 0.15)", stroke: "#2563eb" },
};

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
  const [rotation, setRotation] = useState<number>(0);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const rotatePlan = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // Control de capas ocultas/visibles
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());

  const toggleType = useCallback((tipo: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) {
        next.delete(tipo);
      } else {
        next.add(tipo);
      }
      return next;
    });
  }, []);

  const toggleAllTypes = useCallback((allTypes: string[]) => {
    setHiddenTypes((prev) => {
      if (prev.size === allTypes.length) {
        return new Set(); // Mostrar todas
      } else {
        return new Set(allTypes); // Ocultar todas
      }
    });
  }, []);

  // Mapear un conjunto ampliado de claves ocultas que incluye tipo Y capa asociada de los items
  const activeHiddenKeys = useMemo(() => {
    const keys = new Set<string>(hiddenTypes);
    if (!activePiso?.items) return keys;
    activePiso.items.forEach((item) => {
      if (hiddenTypes.has(item.tipo) || (item.capa && hiddenTypes.has(item.capa))) {
        if (item.tipo) keys.add(item.tipo);
        if (item.capa) keys.add(item.capa);
      }
    });
    return keys;
  }, [hiddenTypes, activePiso?.items]);

  // Generar reglas CSS declarativas ultra-específicas para capas ocultas
  const hiddenCss = useMemo(() => {
    if (activeHiddenKeys.size === 0) return "";
    const rules = Array.from(activeHiddenKeys).map((key) => {
      const escaped = key.replace(/"/g, '\\"');
      return `[data-tipo="${escaped}"], [data-layer="${escaped}"], [data-capa="${escaped}"]`;
    });
    return `${rules.join(",\n")} { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }`;
  }, [activeHiddenKeys]);

  // Modo de visualización: relleno sombreado traslúcido (usabilidad óptima), solo líneas de colores, o monocromático CAD
  const [displayMode, setDisplayMode] = useState<DisplayMode>("colored-shaded");

  const displayCss = useMemo(() => {
    if (displayMode === "monochrome") return "";

    const rules: string[] = [];

    Object.entries(COLOR_PALETTE).forEach(([tipo, cfg]) => {
      const escaped = tipo.replace(/"/g, '\\"');
      const isText = tipo === "TEXTO";

      if (isText) {
        rules.push(`[data-tipo="TEXTO"]:not(.selected), text.dxf-entity:not(.selected) { fill: ${cfg.fill} !important; opacity: 1 !important; }`);
      } else if (displayMode === "colored-shaded") {
        rules.push(`[data-tipo="${escaped}"]:not(.selected), [data-layer="${escaped}"]:not(.selected), [data-capa="${escaped}"]:not(.selected) {
          fill: ${cfg.fill} !important;
          stroke: ${cfg.stroke} !important;
        }`);
      } else if (displayMode === "colored-lines") {
        rules.push(`[data-tipo="${escaped}"]:not(.selected), [data-layer="${escaped}"]:not(.selected), [data-capa="${escaped}"]:not(.selected) {
          fill: transparent !important;
          stroke: ${cfg.stroke} !important;
        }`);
      }
    });

    return rules.join("\n");
  }, [displayMode]);

  // Aplicar directamente ocultación en DOM SVG en cada render o actualización de transform (pan/zoom)
  useEffect(() => {
    if (!svgWrapperRef.current) return;
    const elements = svgWrapperRef.current.querySelectorAll<SVGElement>("[data-tipo], [data-layer], [data-capa]");
    elements.forEach((el) => {
      const tipo = el.getAttribute("data-tipo");
      const layer = el.getAttribute("data-layer");
      const isHidden = (tipo && activeHiddenKeys.has(tipo)) || (layer && activeHiddenKeys.has(layer));
      if (isHidden) {
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("pointer-events", "none", "important");
        if (el.classList.contains("selected")) {
          el.classList.remove("selected");
        }
      } else {
        el.style.removeProperty("display");
        el.style.removeProperty("pointer-events");
      }
    });

    if (selectedItem) {
      const itemTipo = selectedItem.tipo;
      const itemCapa = selectedItem.capa;
      if (
        (itemTipo && activeHiddenKeys.has(itemTipo)) ||
        (itemCapa && activeHiddenKeys.has(itemCapa))
      ) {
        clearSelectedItem();
      }
    }
  }, [activeHiddenKeys, activePiso, selectedItem, transform, clearSelectedItem]);

  // Pan state
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Medir dimensiones del plano
  const getSvgDimensions = useCallback(() => {
    let svgW = (activePiso?.max_x ?? 0) - (activePiso?.min_x ?? 0);
    let svgH = (activePiso?.max_y ?? 0) - (activePiso?.min_y ?? 0);
    if (svgW <= 0 || svgH <= 0) {
      const match = activePiso?.svg_data?.match(/viewBox=["']([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)["']/i);
      if (match) {
        svgW = parseFloat(match[3]);
        svgH = parseFloat(match[4]);
      }
    }
    if (svgW <= 0) svgW = 1000;
    if (svgH <= 0) svgH = 800;
    return { svgW, svgH };
  }, [activePiso]);

  const fitToContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el || !activePiso) return;
    const { width, height } = el.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    setContainerSize({ w: width, h: height });
    const { svgW, svgH } = getSvgDimensions();

    const scale = Math.min((width * 0.95) / svgW, (height * 0.95) / svgH);
    const translateX = (width - svgW * scale) / 2;
    const translateY = (height - svgH * scale) / 2;

    setTransform({ scale, translateX, translateY });
  }, [activePiso, getSvgDimensions]);

  // Centrar e igualar margen inmediatamente al cargar o guardar un piso
  useEffect(() => {
    if (!activePiso?.svg_data) return;
    const timer = setTimeout(() => {
      fitToContainer();
    }, 50);
    return () => clearTimeout(timer);
  }, [activePiso?.id, activePiso?.svg_data, fitToContainer]);

  // Listener para ajustar automáticamente al redimensionar la ventana o contenedor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      fitToContainer();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitToContainer]);

  // Sincronizar clase .selected en el SVG dinámicamente con el store
  useEffect(() => {
    if (!svgWrapperRef.current) return;
    svgWrapperRef.current
      .querySelectorAll(".dxf-entity.selected")
      .forEach((el) => el.classList.remove("selected"));

    if (!selectedItem) return;

    let svgElemId = selectedItem.id;
    if (selectedItem.metadata_extra) {
      try {
        const meta = JSON.parse(selectedItem.metadata_extra);
        if (meta.svg_element) svgElemId = meta.svg_element;
      } catch {}
    }
    const targetElem = svgWrapperRef.current.querySelector(`#${svgElemId}`);
    if (targetElem) {
      targetElem.classList.add("selected");
    }
  }, [selectedItem]);

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

      // Si la entidad pertenece a una capa deshabilitada/oculta, ignorar el clic
      if (
        (entityType && hiddenTypes.has(entityType)) ||
        (layerName && hiddenTypes.has(layerName)) ||
        entity.style.display === "none" ||
        entity.style.pointerEvents === "none"
      ) {
        clearSelectedItem();
        return;
      }

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

  const svgDims = getSvgDimensions();
  const cx = svgDims.svgW / 2;
  const cy = svgDims.svgH / 2;
  const cssTransform =
    rotation === 0
      ? `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`
      : `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale}) translate(${cx}px, ${cy}px) rotate(${rotation}deg) translate(${-cx}px, ${-cy}px)`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Toolbar visor */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
        <button
          onClick={zoomIn}
          className="w-8 h-8 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-md backdrop-blur-sm"
          title="Acercar (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="w-8 h-8 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-md backdrop-blur-sm"
          title="Alejar (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={rotatePlan}
          className="w-8 h-8 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-md backdrop-blur-sm relative"
          title={`Girar plano 90° (Ángulo actual: ${rotation}°)`}
        >
          <RotateCw className="w-4 h-4" />
          {rotation > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold px-1 rounded-full shadow-sm">
              {rotation}°
            </span>
          )}
        </button>
        <button
          onClick={fitToContainer}
          className="w-8 h-8 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-md backdrop-blur-sm"
          title="Ajustar a la pantalla"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setTransform({ scale: 1, translateX: 0, translateY: 0 });
            setRotation(0);
          }}
          className="w-8 h-8 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-md backdrop-blur-sm"
          title="Restablecer vista y rotación"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Info de escala */}
      <div className="absolute bottom-3 right-3 z-20 bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm backdrop-blur-sm flex items-center gap-1.5">
        <span>{Math.round(transform.scale * 100)}%</span>
        {rotation > 0 && <span className="text-primary font-bold">· {rotation}°</span>}
      </div>

      {/* Info del piso activo y Selector de Modo de Visualización */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-160px)]">
        <div className="bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs shadow-md backdrop-blur-sm text-zinc-900 dark:text-zinc-100 flex items-center">
          <span className="font-bold">
            {activePiso.nombre ?? `Piso ${activePiso.numero}`}
          </span>
          {activePiso.archivo_dxf && (
            <span className="ml-2 text-zinc-500 dark:text-zinc-400 font-mono text-[11px] hidden sm:inline">{activePiso.archivo_dxf}</span>
          )}
          {activePiso.items.length > 0 && (
            <span className="ml-2 text-zinc-500 dark:text-zinc-400 font-medium hidden md:inline">
              · {activePiso.items.length} entidades
            </span>
          )}
        </div>

        {/* Toggle de Modo de Color del Mapa */}
        <div className="bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 shadow-md backdrop-blur-sm flex items-center gap-1 text-xs">
          <button
            onClick={() => setDisplayMode("colored-shaded")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-xs font-semibold select-none",
              displayMode === "colored-shaded"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
            title="Sombreado: Relleno traslúcido suave por capas (Máxima usabilidad)"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sombreado</span>
          </button>
          <button
            onClick={() => setDisplayMode("colored-lines")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-xs font-semibold select-none",
              displayMode === "colored-lines"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
            title="Solo Líneas: Trazos coloreados por capa sin relleno"
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Líneas</span>
          </button>
          <button
            onClick={() => setDisplayMode("monochrome")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-xs font-semibold select-none",
              displayMode === "monochrome"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
            title="CAD Técnico: Blanco y negro estándar LibreCAD"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Monocromo</span>
          </button>
        </div>
      </div>

      {/* Leyenda de capas con control de visibilidad */}
      <LayerLegend
        items={activePiso.items}
        hiddenTypes={hiddenTypes}
        onToggleType={toggleType}
        onToggleAll={toggleAllTypes}
      />

      {/* Área del visor con fondo adaptable a tema claro/oscuro */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-hidden dxf-viewer relative transition-colors duration-300",
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
        {/* Reglas CSS para capas ocultas y estilo de visualización que persisten durante Pan/Zoom */}
        {hiddenCss && <style dangerouslySetInnerHTML={{ __html: hiddenCss }} />}
        {displayCss && <style dangerouslySetInnerHTML={{ __html: displayCss }} />}

        <div
          ref={svgWrapperRef}
          style={{
            transform: cssTransform,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
            width: svgDims.svgW,
            height: svgDims.svgH,
          }}
        >
          {hiddenCss && <style dangerouslySetInnerHTML={{ __html: hiddenCss }} />}
          {displayCss && <style dangerouslySetInnerHTML={{ __html: displayCss }} />}
          <div dangerouslySetInnerHTML={{ __html: activePiso.svg_data }} />
        </div>
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

// ── Leyenda de capas con toggle de visibilidad ────────────────────────────────

const LEGEND_COLORS: Record<string, string> = {
  PARED:           "#334155",
  COLUMNA:         "#64748b",
  AREA:            "#38bdf8",
  SALA:            "#3b82f6",
  LABORATORIO:     "#10b981",
  OFICINA:         "#f59e0b",
  BAÑO:            "#6366f1",
  PASILLO:         "#94a3b8",
  ESCALERA:        "#ec4899",
  ASCENSOR:        "#8b5cf6",
  SALA_SERVIDORES: "#ef4444",
  DEPOSITO:        "#eab308",
  COMEDOR:         "#f97316",
  CAFETERIA:       "#f97316",
  BIBLIOTECA:      "#06b6d4",
  AUDITORIO:       "#22c55e",
  SALA_REUNION:    "#d946ef",
  CARPINTERIA:     "#f97316",
  VENTANA:         "#38bdf8",
  MOBILIARIO:      "#64748b",
  EQUIPO:          "#eab308",
  TEXTO:           "#0ea5e9",
  DEFAULT:         "#3b82f6",
};

const LEGEND_BORDER: Record<string, string> = {
  PARED: "#475569", SALA: "#2563eb", LABORATORIO: "#059669",
  OFICINA: "#d97706", BAÑO: "#4f46e5", ESCALERA: "#db2777",
  ASCENSOR: "#7c3aed", CARPINTERIA: "#ea580c", DEFAULT: "#2563eb",
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

interface LayerLegendProps {
  items: import("@/lib/stores/infrastructure-store").PlanoItem[];
  hiddenTypes: Set<string>;
  onToggleType: (tipo: string) => void;
  onToggleAll: (allTypes: string[]) => void;
}

function LayerLegend({ items, hiddenTypes, onToggleType, onToggleAll }: LayerLegendProps) {
  const [open, setOpen] = useState(true);

  // Contar tipos únicos presentes (excluir COTA si son muchas)
  const typeCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.tipo] = (acc[item.tipo] ?? 0) + 1;
    return acc;
  }, {});

  const types = Object.entries(typeCounts)
    .filter(([t]) => t !== "COTA")
    .sort((a, b) => b[1] - a[1]);

  if (types.length === 0) return null;

  const allTypeKeys = types.map(([t]) => t);
  const allHidden = allTypeKeys.every((t) => hiddenTypes.has(t));

  return (
    <div className="absolute bottom-10 left-3 z-20 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl backdrop-blur-md min-w-[210px] max-w-[240px] text-zinc-900 dark:text-zinc-100">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-bold border-b border-zinc-100 dark:border-zinc-800/80">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>Capas ({types.length})</span>
          <span className="text-zinc-400 dark:text-zinc-500 text-[10px]">{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <button
            onClick={() => onToggleAll(allTypeKeys)}
            className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 hover:text-primary transition-colors"
            title={allHidden ? "Mostrar todas las capas" : "Ocultar todas las capas"}
          >
            {allHidden ? "Mostrar todas" : "Ocultar todas"}
          </button>
        )}
      </div>

      {open && (
        <div className="px-2.5 py-2 space-y-1 max-h-64 overflow-y-auto">
          {types.map(([tipo, count]) => {
            const isHidden = hiddenTypes.has(tipo);
            return (
              <div
                key={tipo}
                onClick={() => onToggleType(tipo)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-all text-xs select-none",
                  isHidden
                    ? "opacity-45 hover:opacity-75 hover:bg-zinc-100 dark:hover:bg-zinc-800/40"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                )}
                title={isHidden ? `Mostrar ${TYPE_LABELS_SHORT[tipo] ?? tipo}` : `Ocultar ${TYPE_LABELS_SHORT[tipo] ?? tipo}`}
              >
                <span
                  className={cn(
                    "w-3 h-3 rounded shrink-0 border shadow-sm transition-opacity",
                    isHidden ? "opacity-30 border-dashed" : "opacity-100"
                  )}
                  style={{
                    background: COLOR_PALETTE[tipo]?.stroke ?? "#2563eb",
                    borderColor: COLOR_PALETTE[tipo]?.stroke ?? "#2563eb",
                  }}
                />
                <span
                  className={cn(
                    "font-semibold flex-1 truncate transition-all",
                    isHidden
                      ? "line-through text-zinc-400 dark:text-zinc-500"
                      : "text-zinc-800 dark:text-zinc-200"
                  )}
                >
                  {TYPE_LABELS_SHORT[tipo] ?? tipo}
                </span>
                <span className="text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500 tabular-nums">
                  {count}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleType(tipo);
                  }}
                  className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  {isHidden ? (
                    <EyeOff className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

