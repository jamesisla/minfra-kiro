"use client";

import { X, Layers, MapPin, Ruler } from "lucide-react";
import { useInfrastructureStore } from "@/lib/stores/infrastructure-store";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  PARED:           "Pared / Muro",
  COLUMNA:         "Columna",
  AREA:            "Área / Recinto",
  SALA:            "Sala",
  LABORATORIO:     "Laboratorio",
  OFICINA:         "Oficina",
  BAÑO:            "Baño / Sanitario",
  PASILLO:         "Pasillo / Corredor",
  ESCALERA:        "Escalera",
  ASCENSOR:        "Ascensor",
  SALA_SERVIDORES: "Sala de Servidores",
  DEPOSITO:        "Depósito",
  COMEDOR:         "Comedor",
  CAFETERIA:       "Cafetería",
  BIBLIOTECA:      "Biblioteca",
  AUDITORIO:       "Auditorio",
  SALA_REUNION:    "Sala de Reuniones",
  CARPINTERIA:     "Carpintería",
  VENTANA:         "Ventana",
  MOBILIARIO:      "Mobiliario",
  EQUIPO:          "Equipo",
  PROYECCION:      "Proyección",
  TEXTO:           "Texto / Rótulo",
  COTA:            "Cota / Dimensión",
  DEFAULT:         "Elemento",
};

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PARED:           { bg: "bg-slate-100 dark:bg-slate-800",  text: "text-slate-700 dark:text-slate-300",  dot: "bg-slate-500" },
  COLUMNA:         { bg: "bg-slate-100 dark:bg-slate-800",  text: "text-slate-700 dark:text-slate-300",  dot: "bg-slate-400" },
  AREA:            { bg: "bg-slate-50 dark:bg-slate-900",   text: "text-slate-600 dark:text-slate-400",  dot: "bg-slate-300" },
  SALA:            { bg: "bg-blue-50 dark:bg-blue-950",     text: "text-blue-700 dark:text-blue-300",    dot: "bg-blue-400" },
  LABORATORIO:     { bg: "bg-green-50 dark:bg-green-950",   text: "text-green-700 dark:text-green-300",  dot: "bg-green-400" },
  OFICINA:         { bg: "bg-amber-50 dark:bg-amber-950",   text: "text-amber-700 dark:text-amber-300",  dot: "bg-amber-400" },
  BAÑO:            { bg: "bg-indigo-50 dark:bg-indigo-950", text: "text-indigo-700 dark:text-indigo-300",dot: "bg-indigo-400" },
  PASILLO:         { bg: "bg-gray-50 dark:bg-gray-900",     text: "text-gray-600 dark:text-gray-400",    dot: "bg-gray-300" },
  ESCALERA:        { bg: "bg-pink-50 dark:bg-pink-950",     text: "text-pink-700 dark:text-pink-300",    dot: "bg-pink-400" },
  ASCENSOR:        { bg: "bg-violet-50 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-300",dot: "bg-violet-400" },
  SALA_SERVIDORES: { bg: "bg-red-50 dark:bg-red-950",       text: "text-red-700 dark:text-red-300",      dot: "bg-red-400" },
  DEPOSITO:        { bg: "bg-yellow-50 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300",dot: "bg-yellow-400" },
  CARPINTERIA:     { bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300",dot: "bg-orange-400" },
  MOBILIARIO:      { bg: "bg-slate-50 dark:bg-slate-900",   text: "text-slate-600 dark:text-slate-400",  dot: "bg-slate-300" },
  TEXTO:           { bg: "bg-gray-50 dark:bg-gray-900",     text: "text-gray-500 dark:text-gray-500",    dot: "bg-gray-300" },
  DEFAULT:         { bg: "bg-secondary",                    text: "text-secondary-foreground",            dot: "bg-muted-foreground" },
};

export function ItemInfoPopup() {
  const { selectedItem, selectedItemPosition, activePiso, clearSelectedItem } =
    useInfrastructureStore();

  if (!selectedItem) return null;

  const label = TYPE_LABELS[selectedItem.tipo] ?? TYPE_LABELS.DEFAULT;
  const colors = TYPE_COLORS[selectedItem.tipo] ?? TYPE_COLORS.DEFAULT;

  const popupStyle: React.CSSProperties = {};
  if (selectedItemPosition) {
    const W = 280, H = 260;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = selectedItemPosition.x + 16;
    let top  = selectedItemPosition.y - 20;
    if (left + W > vw - 12) left = selectedItemPosition.x - W - 16;
    if (top  + H > vh - 12) top  = vh - H - 12;
    if (top < 8) top = 8;
    popupStyle.left = left;
    popupStyle.top  = top;
  }

  let metadata: Record<string, unknown> = {};
  if (selectedItem.metadata_extra) {
    try { metadata = JSON.parse(selectedItem.metadata_extra); } catch { /* ok */ }
  }

  const hasDims = selectedItem.ancho != null && selectedItem.alto != null
    && (selectedItem.ancho > 0 || selectedItem.alto > 0);
  const area = hasDims
    ? ((selectedItem.ancho ?? 0) * (selectedItem.alto ?? 0) / 1000000).toFixed(2)
    : null;

  // Encontrar otros items del mismo tipo en este piso para contexto
  const siblingsCount = activePiso?.items.filter(i => i.tipo === selectedItem.tipo).length ?? 0;

  return (
    <div
      className={cn(
        "fixed z-50 w-[280px] bg-card border border-border rounded-xl shadow-2xl",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-150"
      )}
      style={popupStyle}
      onClick={e => e.stopPropagation()}
    >
      {/* Header con color del tipo */}
      <div className={cn("rounded-t-xl px-4 py-3", colors.bg)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 mt-0.5", colors.dot)} />
            <div className="min-w-0">
              <p className={cn("text-xs font-semibold uppercase tracking-wider", colors.text)}>
                {label}
              </p>
              {selectedItem.nombre && (
                <p className="text-sm font-bold text-foreground leading-tight mt-0.5 truncate">
                  {selectedItem.nombre}
                </p>
              )}
              {metadata.texto && typeof metadata.texto === "string" && !selectedItem.nombre && (
                <p className="text-sm font-medium text-foreground leading-tight mt-0.5">
                  {String(metadata.texto).slice(0, 60)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={clearSelectedItem}
            className="shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="px-4 py-3 space-y-2.5 text-xs">

        {/* Capa DXF */}
        {selectedItem.capa && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-xs">
              {selectedItem.capa}
            </span>
          </div>
        )}

        {/* Dimensiones */}
        {hasDims && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Ruler className="w-3.5 h-3.5 shrink-0" />
            <span>
              {(selectedItem.ancho ?? 0).toFixed(0)} × {(selectedItem.alto ?? 0).toFixed(0)} unidades
              {area && area !== "0.00" && (
                <span className="ml-1 text-foreground font-medium">
                  (~{area} m²)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Posición */}
        {selectedItem.x != null && selectedItem.y != null && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono text-xs">
              {(selectedItem.x ?? 0).toFixed(0)}, {(selectedItem.y ?? 0).toFixed(0)}
            </span>
          </div>
        )}

        {/* Texto completo si es texto */}
        {selectedItem.tipo === "TEXTO" && metadata.texto && (
          <div className="bg-secondary rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-foreground break-words">
              {String(metadata.texto)}
            </p>
          </div>
        )}

        {/* Separador + contexto */}
        <div className="border-t border-border pt-2 flex items-center justify-between text-muted-foreground">
          <span>{siblingsCount} elemento{siblingsCount !== 1 ? "s" : ""} de este tipo en el piso</span>
        </div>
      </div>
    </div>
  );
}
