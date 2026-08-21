"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Layers,
  MapPin,
  Ruler,
  Edit3,
  Save,
  Check,
  Loader2,
  Tag,
  Users,
  UserPlus,
  Trash2,
  Shield,
  Briefcase,
  Building,
} from "lucide-react";
import { useInfrastructureStore } from "@/lib/stores/infrastructure-store";
import { apiClient } from "@/lib/api/client";
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

const TYPE_COLORS: Record<string, { accent: string; badgeBg: string; text: string; dot: string }> = {
  PARED:           { accent: "bg-slate-500",  badgeBg: "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700", text: "text-slate-800 dark:text-slate-200", dot: "bg-slate-500" },
  COLUMNA:         { accent: "bg-slate-500",  badgeBg: "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700", text: "text-slate-800 dark:text-slate-200", dot: "bg-slate-400" },
  AREA:            { accent: "bg-cyan-500",   badgeBg: "bg-cyan-50 dark:bg-cyan-950/80 border-cyan-300 dark:border-cyan-800",       text: "text-cyan-800 dark:text-cyan-200",   dot: "bg-cyan-400" },
  SALA:            { accent: "bg-blue-500",   badgeBg: "bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800",       text: "text-blue-800 dark:text-blue-200",   dot: "bg-blue-500" },
  LABORATORIO:     { accent: "bg-emerald-500",badgeBg: "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800", text: "text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-500" },
  OFICINA:         { accent: "bg-amber-500",  badgeBg: "bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800",    text: "text-amber-800 dark:text-amber-200",  dot: "bg-amber-500" },
  BAÑO:            { accent: "bg-indigo-500", badgeBg: "bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-800", text: "text-indigo-800 dark:text-indigo-200", dot: "bg-indigo-500" },
  PASILLO:         { accent: "bg-zinc-500",   badgeBg: "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700",     text: "text-zinc-800 dark:text-zinc-200",   dot: "bg-zinc-400" },
  ESCALERA:        { accent: "bg-pink-500",   badgeBg: "bg-pink-50 dark:bg-pink-950/80 border-pink-300 dark:border-pink-800",       text: "text-pink-800 dark:text-pink-200",   dot: "bg-pink-500" },
  ASCENSOR:        { accent: "bg-violet-500", badgeBg: "bg-violet-50 dark:bg-violet-950/80 border-violet-300 dark:border-violet-800", text: "text-violet-800 dark:text-violet-200", dot: "bg-violet-500" },
  SALA_SERVIDORES: { accent: "bg-red-500",    badgeBg: "bg-red-50 dark:bg-red-950/80 border-red-300 dark:border-red-800",          text: "text-red-800 dark:text-red-200",      dot: "bg-red-500" },
  DEPOSITO:        { accent: "bg-yellow-500", badgeBg: "bg-yellow-50 dark:bg-yellow-950/80 border-yellow-300 dark:border-yellow-800", text: "text-yellow-800 dark:text-yellow-200", dot: "bg-yellow-500" },
  CARPINTERIA:     { accent: "bg-orange-500", badgeBg: "bg-orange-50 dark:bg-orange-950/80 border-orange-300 dark:border-orange-800", text: "text-orange-800 dark:text-orange-200", dot: "bg-orange-500" },
  MOBILIARIO:      { accent: "bg-slate-500",  badgeBg: "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700", text: "text-slate-800 dark:text-slate-200", dot: "bg-slate-400" },
  TEXTO:           { accent: "bg-sky-500",    badgeBg: "bg-sky-50 dark:bg-sky-950/80 border-sky-300 dark:border-sky-800",          text: "text-sky-800 dark:text-sky-200",      dot: "bg-sky-400" },
  DEFAULT:         { accent: "bg-blue-600",   badgeBg: "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700",         text: "text-zinc-800 dark:text-zinc-200",   dot: "bg-blue-500" },
};

interface AsignacionPersona {
  id: string;
  espacio_id: string;
  persona_id: string;
  rol: string;
  puesto_identificador?: string | null;
  persona?: {
    id: string;
    nombre_completo: string;
    email?: string | null;
    cargo?: string | null;
    tipo?: string;
  } | null;
}

export function ItemInfoPopup() {
  const {
    selectedItem,
    selectedItemPosition,
    activePiso,
    clearSelectedItem,
    updatePlanoItem,
    authToken,
  } = useInfrastructureStore();

  const [activeTab, setActiveTab] = useState<"general" | "personas">("general");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State General
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [capa, setCapa] = useState("");
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState("Disponible");
  const [notas, setNotas] = useState("");

  // Personas State
  const [personas, setPersonas] = useState<AsignacionPersona[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [showAddPersona, setShowAddPersona] = useState(false);
  const [nuevaPersonaNombre, setNuevaPersonaNombre] = useState("");
  const [nuevaPersonaEmail, setNuevaPersonaEmail] = useState("");
  const [nuevaPersonaCargo, setNuevaPersonaCargo] = useState("");
  const [nuevaPersonaRol, setNuevaPersonaRol] = useState("OCUPANTE");
  const [addingPersonaLoading, setAddingPersonaLoading] = useState(false);

  const fetchPeopleForSpace = useCallback(async (espacioId: string) => {
    if (!authToken) return;
    setLoadingPersonas(true);
    try {
      const data = await apiClient.get<AsignacionPersona[]>(
        `/api/v1/spaces/${espacioId}/people`,
        { token: authToken }
      );
      setPersonas(data || []);
    } catch {
      setPersonas([]);
    } finally {
      setLoadingPersonas(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (selectedItem) {
      setNombre(selectedItem.nombre ?? "");
      setTipo(selectedItem.tipo ?? "DEFAULT");
      setCapa(selectedItem.capa ?? "");
      setActiveTab("general");
      setShowAddPersona(false);

      let meta: Record<string, any> = {};
      if (selectedItem.metadata_extra) {
        try {
          meta = JSON.parse(selectedItem.metadata_extra);
        } catch {}
      }
      setCodigo(meta.codigo ?? "");
      setEstado(meta.estado ?? "Disponible");
      setNotas(meta.notas ?? "");
      setIsEditing(false);
      setSaveSuccess(false);

      if (selectedItem.espacio_id) {
        fetchPeopleForSpace(selectedItem.espacio_id);
      } else {
        setPersonas([]);
      }
    }
  }, [selectedItem, fetchPeopleForSpace]);

  if (!selectedItem) return null;

  const label = TYPE_LABELS[selectedItem.tipo] ?? TYPE_LABELS.DEFAULT;
  const colors = TYPE_COLORS[selectedItem.tipo] ?? TYPE_COLORS.DEFAULT;

  const popupStyle: React.CSSProperties = {};
  if (selectedItemPosition) {
    const W = isEditing ? 340 : 320;
    const H = isEditing ? 420 : 380;
    const vw = window.innerWidth,
      vh = window.innerHeight;
    let left = selectedItemPosition.x + 16;
    let top = selectedItemPosition.y - 20;
    if (left + W > vw - 12) left = selectedItemPosition.x - W - 16;
    if (top + H > vh - 12) top = vh - H - 12;
    if (top < 8) top = 8;
    if (left < 8) left = 8;
    popupStyle.left = left;
    popupStyle.top = top;
  }

  let metadata: Record<string, any> = {};
  if (selectedItem.metadata_extra) {
    try {
      metadata = JSON.parse(selectedItem.metadata_extra);
    } catch {}
  }

  const hasDims =
    selectedItem.ancho != null &&
    selectedItem.alto != null &&
    (selectedItem.ancho > 0 || selectedItem.alto > 0);
  const area = hasDims
    ? (((selectedItem.ancho ?? 0) * (selectedItem.alto ?? 0)) / 1000000).toFixed(2)
    : null;

  const siblingsCount =
    activePiso?.items.filter((i) => i.tipo === selectedItem.tipo).length ?? 0;

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

  const handleAddPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !nuevaPersonaNombre.trim() || !selectedItem.espacio_id) return;
    setAddingPersonaLoading(true);
    try {
      // 1. Crear la persona
      const personaRes = await apiClient.post<{ id: string }>(
        "/api/v1/people",
        {
          nombre_completo: nuevaPersonaNombre.trim(),
          email: nuevaPersonaEmail.trim() || null,
          cargo: nuevaPersonaCargo.trim() || null,
          tipo: "DOCENTE",
        },
        { token: authToken }
      );

      // 2. Asignarla al espacio
      await apiClient.post(
        `/api/v1/spaces/${selectedItem.espacio_id}/people`,
        {
          espacio_id: selectedItem.espacio_id,
          persona_id: personaRes.id,
          rol: nuevaPersonaRol,
        },
        { token: authToken }
      );

      // Limpiar formulario y refrescar
      setNuevaPersonaNombre("");
      setNuevaPersonaEmail("");
      setNuevaPersonaCargo("");
      setShowAddPersona(false);
      await fetchPeopleForSpace(selectedItem.espacio_id);
    } catch (err) {
      console.error("Error asignando persona:", err);
    } finally {
      setAddingPersonaLoading(false);
    }
  };

  const handleRemovePersona = async (asigId: string) => {
    if (!authToken || !selectedItem.espacio_id) return;
    try {
      await apiClient.delete(`/api/v1/spaces/assignments/${asigId}`, {
        token: authToken,
      });
      await fetchPeopleForSpace(selectedItem.espacio_id);
    } catch (err) {
      console.error("Error al remover asignación:", err);
    }
  };

  return (
    <div
      className={cn(
        "fixed z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden opacity-100",
        isEditing ? "w-[340px]" : "w-[320px]",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-150"
      )}
      style={popupStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Barra superior de acento con color vibrante */}
      <div className={cn("h-1.5 w-full", colors.accent)} />

      {/* Header */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ring-2 ring-white dark:ring-zinc-950",
                colors.dot
              )}
            />
            <div className="min-w-0">
              <span
                className={cn(
                  "inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                  colors.badgeBg,
                  colors.text
                )}
              >
                {label}
              </span>
              {selectedItem.nombre ? (
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight mt-1 truncate">
                  {selectedItem.nombre}
                </p>
              ) : metadata.texto && typeof metadata.texto === "string" ? (
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight mt-1">
                  {String(metadata.texto).slice(0, 50)}
                </p>
              ) : (
                <p className="text-xs italic text-zinc-400 dark:text-zinc-500 mt-1">
                  Sin nombre asignado
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isEditing && activeTab === "general" && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                title="Modificar datos de este espacio"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={clearSelectedItem}
              className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pestañas de navegación interna */}
        {!isEditing && (
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
            <button
              onClick={() => setActiveTab("general")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors",
                activeTab === "general"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Building className="w-3 h-3" />
              <span>Espacio</span>
            </button>
            <button
              onClick={() => setActiveTab("personas")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors",
                activeTab === "personas"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Users className="w-3 h-3" />
              <span>Personas ({personas.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Contenido según pestaña */}
      {isEditing ? (
        <form onSubmit={handleSave} className="p-4 space-y-3 text-xs bg-white dark:bg-zinc-950">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Nombre / Identificador
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Sala de Conferencia A-102"
              className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Tipo / Categoría
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(TYPE_LABELS).map(([key, lbl]) => (
                  <option key={key} value={key}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Capa DXF
              </label>
              <input
                type="text"
                value={capa}
                onChange={(e) => setCapa(e.target.value)}
                placeholder="Nombre capa"
                className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Código de Espacio
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: ESP-204"
                className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              >
                <option value="Disponible">Disponible</option>
                <option value="Ocupado">Ocupado</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Reservado">Reservado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Notas / Descripción
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles del recinto, equipamiento o capacidad..."
              className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 text-xs transition-colors disabled:opacity-50 shadow-md"
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
      ) : activeTab === "general" ? (
        /* Pestaña: Espacio General */
        <div className="p-4 space-y-3 text-xs bg-white dark:bg-zinc-950">
          {saveSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-md flex items-center gap-1.5 text-xs animate-in fade-in-0 font-medium">
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>¡Datos actualizados correctamente!</span>
            </div>
          )}

          {/* Atributos extra si existen */}
          {(metadata.codigo || metadata.estado) && (
            <div className="flex items-center gap-2">
              {metadata.codigo && (
                <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-800 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                  {metadata.codigo}
                </span>
              )}
              {metadata.estado && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm",
                    metadata.estado === "Disponible" &&
                      "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
                    metadata.estado === "Ocupado" &&
                      "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
                    metadata.estado === "Mantenimiento" &&
                      "bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800",
                    metadata.estado === "Reservado" &&
                      "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800"
                  )}
                >
                  {metadata.estado}
                </span>
              )}
            </div>
          )}

          {/* Capa DXF */}
          {selectedItem.capa && (
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Layers className="w-3.5 h-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
              <span className="font-medium">Capa:</span>
              <span className="font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 rounded text-xs text-zinc-900 dark:text-zinc-100 font-semibold">
                {selectedItem.capa}
              </span>
            </div>
          )}

          {/* Dimensiones y Área m² */}
          {(hasDims || metadata.area_m2) && (
            <div className="space-y-1 bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Área Calculada:
                  </span>
                </div>
                <span className="text-zinc-900 dark:text-zinc-100 font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-800 text-xs">
                  {metadata.area_m2 ? `${metadata.area_m2} m²` : `${area} m²`}
                </span>
              </div>

              {metadata.perimetro_m && (
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
                  <span>Perímetro:</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                    {metadata.perimetro_m} m
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bloque CAD */}
          {metadata.bloque && (
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Tag className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span className="font-medium">Bloque CAD:</span>
              <span className="font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded text-xs font-bold">
                {metadata.bloque}
              </span>
            </div>
          )}

          {/* Coordenadas */}
          {selectedItem.x != null && selectedItem.y != null && (
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
              <span className="font-medium">Coords:</span>
              <span className="font-mono text-xs text-zinc-900 dark:text-zinc-100 font-semibold">
                X: {(selectedItem.x ?? 0).toFixed(0)}, Y: {(selectedItem.y ?? 0).toFixed(0)}
              </span>
            </div>
          )}

          {/* Notas */}
          {metadata.notas && (
            <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 space-y-1">
              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Notas
              </p>
              <p className="text-xs text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed">
                {metadata.notas}
              </p>
            </div>
          )}

          {/* Footer info */}
          <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              {siblingsCount} {TYPE_LABELS_SHORT[selectedItem.tipo] ?? "elementos"} en piso
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Edit3 className="w-3 h-3" />
              <span>Editar datos</span>
            </button>
          </div>
        </div>
      ) : (
        /* Pestaña: Personas Asignadas (Fase 1) */
        <div className="p-4 space-y-3 text-xs bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              Personal Asignado
            </h4>
            {!showAddPersona && selectedItem.espacio_id && (
              <button
                onClick={() => setShowAddPersona(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <UserPlus className="w-3 h-3" />
                <span>Asignar persona</span>
              </button>
            )}
          </div>

          {showAddPersona ? (
            <form
              onSubmit={handleAddPersona}
              className="p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2"
            >
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mb-0.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={nuevaPersonaNombre}
                  onChange={(e) => setNuevaPersonaNombre(e.target.value)}
                  placeholder="Ej: Dr. Carlos Mendoza"
                  className="w-full px-2 py-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mb-0.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={nuevaPersonaEmail}
                    onChange={(e) => setNuevaPersonaEmail(e.target.value)}
                    placeholder="email@univ.edu"
                    className="w-full px-2 py-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mb-0.5">
                    Rol en Espacio
                  </label>
                  <select
                    value={nuevaPersonaRol}
                    onChange={(e) => setNuevaPersonaRol(e.target.value)}
                    className="w-full px-2 py-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded text-xs text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="RESPONSABLE">Responsable</option>
                    <option value="OCUPANTE">Ocupante</option>
                    <option value="BRIGADISTA">Brigadista</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mb-0.5">
                  Cargo / Función
                </label>
                <input
                  type="text"
                  value={nuevaPersonaCargo}
                  onChange={(e) => setNuevaPersonaCargo(e.target.value)}
                  placeholder="Ej: Encargado de Laboratorio"
                  className="w-full px-2 py-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddPersona(false)}
                  className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addingPersonaLoading}
                  className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {addingPersonaLoading ? "Asignando..." : "Guardar Asignación"}
                </button>
              </div>
            </form>
          ) : loadingPersonas ? (
            <div className="py-4 flex justify-center text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : personas.length === 0 ? (
            <div className="py-4 text-center text-zinc-400 dark:text-zinc-500 text-xs">
              No hay personas asignadas a este recinto.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {personas.map((asig) => (
                <div
                  key={asig.id}
                  className="p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {asig.persona?.nombre_completo || "Persona"}
                      </p>
                      <span
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase",
                          asig.rol === "RESPONSABLE"
                            ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800"
                            : asig.rol === "BRIGADISTA"
                            ? "bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
                            : "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800"
                        )}
                      >
                        {asig.rol}
                      </span>
                    </div>
                    {asig.persona?.cargo && (
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-2.5 h-2.5" />
                        {asig.persona.cargo}
                      </p>
                    )}
                    {asig.persona?.email && (
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono truncate">
                        {asig.persona.email}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemovePersona(asig.id)}
                    className="p-1 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Desvincular del espacio"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TYPE_LABELS_SHORT: Record<string, string> = {
  SALA: "Salas",
  LABORATORIO: "Labs",
  OFICINA: "Oficinas",
  BAÑO: "Baños",
  PASILLO: "Pasillos",
  ESCALERA: "Escaleras",
  ASCENSOR: "Ascensores",
  MOBILIARIO: "Muebles",
  EQUIPO: "Equipos",
  PARED: "Muros",
  TEXTO: "Textos",
};
