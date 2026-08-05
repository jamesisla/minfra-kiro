"use client";

import { useState, useEffect } from "react";
import { X, Layers, MapPin, Ruler, Edit3, Save, Check, Loader2 } from "lucide-react";
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
  const { selectedItem, selectedItemPosition, activePiso, clearSelectedItem, updatePlanoItem } =
    useInfrastructureStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [capa, setCapa] = useState("");
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState("Disponible");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (selectedItem) {
      setNombre(selectedItem.nombre ?? "");
      setTipo(selectedItem.tipo ?? "DEFAULT");
      setCapa(selectedItem.capa ?? "");

      let meta: Record<string, any> = {};
      if (selectedItem.metadata_extra) {
        try { meta = JSON.parse(selectedItem.metadata_extra); } catch {}
      }
      setCodigo(meta.codigo ?? "");
      setEstado(meta.estado ?? "Disponible");
      setNotas(meta.notas ?? "");
      setIsEditing(false);
      setSaveSuccess(false);
    }
  }, [selectedItem]);

  if (!selectedItem) return null;

  const label = TYPE_LABELS[selectedItem.tipo] ?? TYPE_LABELS.DEFAULT;
  const colors = TYPE_COLORS[selectedItem.tipo] ?? TYPE_COLORS.DEFAULT;

  const popupStyle: React.CSSProperties = {};
  if (selectedItemPosition) {
    const W = isEditing ? 320 : 290;
    const H = isEditing ? 380 : 280;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = selectedItemPosition.x + 16;
    let top  = selectedItemPosition.y - 20;
    if (left + W > vw - 12) left = selectedItemPosition.x - W - 16;
    if (top  + H > vh - 12) top  = vh - H - 12;
    if (top < 8) top = 8;
    if (left < 8) left = 8;
    popupStyle.left = left;
    popupStyle.top  = top;
  }

  let metadata: Record<string, any> = {};
  if (selectedItem.metadata_extra) {
    try { metadata = JSON.parse(selectedItem.metadata_extra); } catch { /* ok */ }
  }

  const hasDims = selectedItem.ancho != null && selectedItem.alto != null
    && (selectedItem.ancho > 0 || selectedItem.alto > 0);
  const area = hasDims
    ? ((selectedItem.ancho ?? 0) * (selectedItem.alto ?? 0) / 1000000).toFixed(2)
    : null;

  const siblingsCount = activePiso?.items.filter(i => i.tipo === selectedItem.tipo).length ?? 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const newMetadata = {
      ...metadata,
      codigo: codigo.trim() || undefined,
      estado: estado || undefined,
      notas: notas.trim() || undefined,
    };

    try {
      await updatePlanoItem(selectedItem.id, {
        nombre: nombre.trim() || null,
        tipo: tipo || selectedItem.tipo,
        capa: capa.trim() || null,
        metadata_extra: JSON.stringify(newMetadata),
      });
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
      setIsEditing(false);
    } catch (err) {
      console.error("Error al guardar item:", err);
      setIsSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed z-50 bg-card border border-border rounded-xl shadow-2xl overflow-hidden",
        isEditing ? "w-[320px]" : "w-[290px]",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-150"
      )}
      style={popupStyle}
      onClick={e => e.stopPropagation()}
    >
      {/* Header con color del tipo */}
      <div className={cn("px-4 py-3 border-b border-border/40", colors.bg)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 mt-0.5", colors.dot)} />
            <div className="min-w-0">
              <p className={cn("text-[10px] font-bold uppercase tracking-wider", colors.text)}>
                {label}
              </p>
              {selectedItem.nombre ? (
                <p className="text-sm font-bold text-foreground leading-tight mt-0.5 truncate">
                  {selectedItem.nombre}
                </p>
              ) : metadata.texto && typeof metadata.texto === "string" ? (
                <p className="text-sm font-medium text-foreground leading-tight mt-0.5">
                  {String(metadata.texto).slice(0, 50)}
                </p>
              ) : (
                <p className="text-xs italic text-muted-foreground mt-0.5">Sin nombre asignado</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                title="Modificar datos de este espacio"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={clearSelectedItem}
              className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modo Edición */}
      {isEditing ? (
        <form onSubmit={handleSave} className="p-4 space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Nombre / Identificador
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Sala de Conferencia A-102"
              className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Tipo / Categoría
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-2 py-1.5 bg-background border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {Object.entries(TYPE_LABELS).map(([key, lbl]) => (
                  <option key={key} value={key}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Capa DXF
              </label>
              <input
                type="text"
                value={capa}
                onChange={(e) => setCapa(e.target.value)}
                placeholder="Nombre capa"
                className="w-full px-2 py-1.5 bg-background border border-border rounded-md text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Código de Activo / Espacio
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: ESP-204"
                className="w-full px-2 py-1.5 bg-background border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-2 py-1.5 bg-background border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="Disponible">Disponible</option>
                <option value="Ocupado">Ocupado</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Reservado">Reservado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Notas / Descripción
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles del recinto, equipamiento o capacidad..."
              className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-md text-muted-foreground hover:bg-secondary text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 text-xs transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando…</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Modo Visualización Detallada */
        <div className="p-4 space-y-3 text-xs">
          {saveSuccess && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs animate-in fade-in-0">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>¡Datos actualizados correctamente!</span>
            </div>
          )}

          {/* Atributos extra si existen */}
          {(metadata.codigo || metadata.estado) && (
            <div className="flex items-center gap-2">
              {metadata.codigo && (
                <span className="bg-primary/10 text-primary font-mono font-semibold px-2 py-0.5 rounded text-[11px]">
                  {metadata.codigo}
                </span>
              )}
              {metadata.estado && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                    metadata.estado === "Disponible" && "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
                    metadata.estado === "Ocupado" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
                    metadata.estado === "Mantenimiento" && "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
                    metadata.estado === "Reservado" && "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
                  )}
                >
                  {metadata.estado}
                </span>
              )}
            </div>
          )}

          {/* Capa DXF */}
          {selectedItem.capa && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Capa:</span>
              <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-xs text-foreground">
                {selectedItem.capa}
              </span>
            </div>
          )}

          {/* Dimensiones y Área */}
          {hasDims && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Ruler className="w-3.5 h-3.5 shrink-0" />
              <span>
                {(selectedItem.ancho ?? 0).toFixed(0)} × {(selectedItem.alto ?? 0).toFixed(0)} mm
                {area && area !== "0.00" && (
                  <span className="ml-1.5 text-foreground font-semibold">
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
              <span>Coords:</span>
              <span className="font-mono text-xs text-foreground">
                X: {(selectedItem.x ?? 0).toFixed(0)}, Y: {(selectedItem.y ?? 0).toFixed(0)}
              </span>
            </div>
          )}

          {/* Notas/Descripción extra */}
          {metadata.notas && (
            <div className="bg-secondary/60 rounded-lg p-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Notas</p>
              <p className="text-xs text-foreground leading-relaxed">{metadata.notas}</p>
            </div>
          )}

          {/* Texto extra del DXF */}
          {selectedItem.tipo === "TEXTO" && metadata.texto && !metadata.notas && (
            <div className="bg-secondary/60 rounded-lg p-2.5">
              <p className="text-xs font-medium text-foreground break-words">
                "{String(metadata.texto)}"
              </p>
            </div>
          )}

          {/* Botón de modificación y footer */}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {siblingsCount} {TYPE_LABELS_SHORT[selectedItem.tipo] ?? "elementos"} en piso
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Edit3 className="w-3 h-3" />
              <span>Editar datos</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const TYPE_LABELS_SHORT: Record<string, string> = {
  SALA: "Salas", LABORATORIO: "Labs", OFICINA: "Oficinas", BAÑO: "Baños",
  PASILLO: "Pasillos", ESCALERA: "Escaleras", ASCENSOR: "Ascensores",
  MOBILIARIO: "Muebles", EQUIPO: "Equipos", PARED: "Muros", TEXTO: "Textos",
};
