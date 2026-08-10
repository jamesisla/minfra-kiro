"use client";

/**
 * Componente de Reportes & Métricas de Infraestructura.
 * Permite analizar cuantitativa y cualitativamente la superficie (m²)
 * y distribución de recintos a nivel Total, Sede, Edificio o Piso.
 */

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building,
  Building2,
  Download,
  Layers,
  MapPin,
  Maximize2,
  PieChart,
  RotateCw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useInfrastructureStore } from "@/lib/stores/infrastructure-store";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface CategoryReport {
  tipo: string;
  label: string;
  cantidad: number;
  area_total_m2: number;
  porcentaje_area: number;
}

interface ItemReportDetail {
  id: string;
  nombre: string | null;
  tipo: string;
  capa: string | null;
  area_m2: number | null;
  perimetro_m: number | null;
  sede_nombre: string;
  edificio_nombre: string;
  piso_nombre: string;
}

interface ReportSummary {
  scope: string;
  scope_id: string | null;
  scope_name: string;
  total_area_m2: number;
  total_recintos: number;
  total_sedes: number;
  total_edificios: number;
  total_pisos: number;
  categorias: CategoryReport[];
  items_detalle: ItemReportDetail[];
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  SALA:            { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20", bar: "bg-blue-500" },
  LABORATORIO:     { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", bar: "bg-emerald-500" },
  OFICINA:         { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20", bar: "bg-amber-500" },
  BAÑO:            { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20", bar: "bg-indigo-500" },
  PASILLO:         { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/20", bar: "bg-slate-500" },
  ESCALERA:        { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/20", bar: "bg-pink-500" },
  ASCENSOR:        { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20", bar: "bg-purple-500" },
  PARED:           { bg: "bg-zinc-500/10", text: "text-zinc-600 dark:text-zinc-400", border: "border-zinc-500/20", bar: "bg-zinc-500" },
  DEPOSITO:        { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-500/20", bar: "bg-yellow-500" },
  DEFAULT:         { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20", bar: "bg-blue-500" },
};

export function ReportsView() {
  const {
    tree,
    authToken,
    selectedSedeId,
    selectedEdificioId,
    selectedPisoId,
    selectSede,
    selectEdificio,
    selectPiso,
    setActiveTab,
    activeTab,
    activePiso,
  } = useInfrastructureStore();

  const [scope, setScope] = useState<"total" | "sede" | "edificio" | "piso">("total");

  // Obtener la Sede, Edificio y Piso activos en cascada de forma jerárquica
  const currentSede = useMemo(() => {
    if (!tree?.sedes?.length) return null;
    return tree.sedes.find((s) => s.id === selectedSedeId) || tree.sedes[0];
  }, [tree, selectedSedeId]);

  const currentEdificio = useMemo(() => {
    if (!currentSede?.edificios?.length) return null;
    return currentSede.edificios.find((e) => e.id === selectedEdificioId) || currentSede.edificios[0];
  }, [currentSede, selectedEdificioId]);

  const currentPiso = useMemo(() => {
    if (!currentEdificio?.pisos?.length) return null;
    return currentEdificio.pisos.find((p) => p.id === selectedPisoId) || currentEdificio.pisos[0];
  }, [currentEdificio, selectedPisoId]);

  // ID correspondiente al alcance (scope) activo
  const scopeId = useMemo(() => {
    if (scope === "sede") return currentSede?.id || null;
    if (scope === "edificio") return currentEdificio?.id || null;
    if (scope === "piso") return currentPiso?.id || null;
    return null;
  }, [scope, currentSede?.id, currentEdificio?.id, currentPiso?.id]);

  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState<string | null>(null);

  // Cargar reporte de la API (re-ejecutar cuando cambia scope, scopeId, authToken, o cuando se sube/actualiza un piso)
  const loadReportData = () => {
    const token = authToken || (typeof window !== "undefined" ? localStorage.getItem("minfra-token") : null);
    if (!token) return;
    setLoading(true);
    setError(null);

    const queryParams = new URLSearchParams({ scope });
    if (scopeId) queryParams.set("scope_id", scopeId);

    apiClient
      .get<ReportSummary>(`/api/v1/infrastructure/reports?${queryParams.toString()}`, { token })
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar reporte:", err);
        setError(err.message || "Error al cargar los datos del reporte.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReportData();
  }, [scope, scopeId, authToken, activeTab, activePiso?.id, activePiso?.archivo_dxf, activePiso?.items?.length]);

  // Filtrado local de la tabla de recintos
  const filteredItems = useMemo(() => {
    if (!report?.items_detalle) return [];
    return report.items_detalle.filter((item) => {
      const matchCat = !selectedCatFilter || item.tipo === selectedCatFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.nombre && item.nombre.toLowerCase().includes(q)) ||
        (item.tipo && item.tipo.toLowerCase().includes(q)) ||
        (item.capa && item.capa.toLowerCase().includes(q)) ||
        (item.edificio_nombre && item.edificio_nombre.toLowerCase().includes(q)) ||
        (item.piso_nombre && item.piso_nombre.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [report?.items_detalle, selectedCatFilter, searchQuery]);

  // Exportar reporte a CSV
  const exportToCSV = () => {
    if (!report || filteredItems.length === 0) return;

    const headers = [
      "Nombre/Código",
      "Tipo",
      "Capa DXF",
      "Superficie (m2)",
      "Perímetro (m)",
      "Sede",
      "Edificio",
      "Piso",
    ];

    const rows = filteredItems.map((item) => [
      `"${item.nombre ?? "-"}"`,
      `"${item.tipo}"`,
      `"${item.capa ?? "-"}"`,
      item.area_m2 ?? 0,
      item.perimetro_m ?? 0,
      `"${item.sede_nombre}"`,
      `"${item.edificio_nombre}"`,
      `"${item.piso_nombre}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Infraestructura_${report.scope_name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background/50 p-4 md:p-6 space-y-6">
      {/* ── Encabezado y Filtros de Alcance ──────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Reportes & Métricas de Espacios
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consolidado cuantitativo de m² y recintos en infraestructura física
          </p>
        </div>

        {/* Alcance (Scope) */}
        <div className="flex flex-wrap items-center gap-2 bg-card p-1.5 rounded-xl border border-border shadow-sm">
          <button
            onClick={() => setScope("total")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
              scope === "total"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Total General
          </button>
          <button
            onClick={() => setScope("sede")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
              scope === "sede"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            Por Sede
          </button>
          <button
            onClick={() => setScope("edificio")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
              scope === "edificio"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Building className="w-3.5 h-3.5" />
            Por Edificio
          </button>
          <button
            onClick={() => setScope("piso")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
              scope === "piso"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Por Piso
          </button>
          <div className="w-px h-4 bg-border mx-1 hidden sm:block" />
          <button
            onClick={loadReportData}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Recargar datos del reporte desde la base de datos"
          >
            <RotateCw className={cn("w-3.5 h-3.5 text-primary", loading && "animate-spin")} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Selectores Específicos según alcance */}
      {scope !== "total" && tree && tree.sedes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-card/60 p-3 rounded-xl border border-border/80">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Seleccionar:
          </span>

          {/* Sede selector */}
          {(scope === "sede" || scope === "edificio" || scope === "piso") && (
            <select
              value={currentSede?.id || ""}
              onChange={(e) => {
                const targetSedeId = e.target.value;
                selectSede(targetSedeId);
                const targetSede = tree.sedes.find((s) => s.id === targetSedeId);
                if (targetSede?.edificios?.length) {
                  const firstEd = targetSede.edificios[0];
                  selectEdificio(firstEd.id);
                  if (firstEd.pisos?.length && authToken) {
                    selectPiso(firstEd.pisos[0].id, authToken);
                  }
                }
              }}
              className="bg-background border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            >
              {tree.sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  Sede: {s.nombre}
                </option>
              ))}
            </select>
          )}

          {/* Edificio selector */}
          {(scope === "edificio" || scope === "piso") && (
            <select
              value={currentEdificio?.id || ""}
              onChange={(e) => {
                const targetEdId = e.target.value;
                selectEdificio(targetEdId);
                const targetEd = currentSede?.edificios?.find((ed) => ed.id === targetEdId);
                if (targetEd?.pisos?.length && authToken) {
                  selectPiso(targetEd.pisos[0].id, authToken);
                }
              }}
              className="bg-background border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            >
              {(currentSede?.edificios || []).map((e) => (
                <option key={e.id} value={e.id}>
                  Edificio: {e.nombre}
                </option>
              ))}
            </select>
          )}

          {/* Piso selector */}
          {scope === "piso" && (
            <select
              value={currentPiso?.id || ""}
              onChange={(e) => {
                const targetPisoId = e.target.value;
                if (authToken) selectPiso(targetPisoId, authToken);
              }}
              className="bg-background border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            >
              {(currentEdificio?.pisos || []).map((p) => (
                <option key={p.id} value={p.id}>
                  Piso {p.numero} {p.nombre ? `(${p.nombre})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* State Loading & Error */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-muted-foreground font-medium">Calculando métricas del reporte…</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center">
          {error}
        </div>
      )}

      {!loading && !error && report && (
        <>
          {/* ── KPI Cards (Resumen Principal) ───────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Superficie Total Útil</span>
                <Maximize2 className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-extrabold text-foreground mt-2 font-mono tabular-nums">
                {report.total_area_m2.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">m²</span>
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block truncate">
                {report.scope_name}
              </span>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Total de Recintos</span>
                <Building2 className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-extrabold text-foreground mt-2 font-mono tabular-nums">
                {report.total_recintos.toLocaleString()}
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Ambientes identificados
              </span>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Infraestructura</span>
                <Building className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl font-bold text-foreground mt-2 font-mono tabular-nums">
                {report.total_sedes} <span className="text-xs font-normal text-muted-foreground">sedes</span> · {report.total_edificios} <span className="text-xs font-normal text-muted-foreground">edif.</span>
              </p>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                {report.total_pisos} plantas registradas
              </span>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Promedio m² / Recinto</span>
                <BarChart3 className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-extrabold text-foreground mt-2 font-mono tabular-nums">
                {report.total_recintos > 0 ? (report.total_area_m2 / report.total_recintos).toFixed(1) : "0"} <span className="text-sm font-normal text-muted-foreground">m²</span>
              </p>
            </div>
          </div>

          {/* ── Banner de Estado Vacío (Sin planos CAD procesados) ───────────── */}
          {report.total_recintos === 0 && (
            <div className="bg-card border border-amber-500/30 rounded-2xl p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-sm font-bold text-foreground">
                  Sin recintos procesados para {report.scope_name}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para que se muestren métricas, m² y clasificación de recintos (salas, oficinas, labs), es necesario subir un plano <strong>.DXF</strong> en los pisos correspondientes.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("viewer")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow hover:bg-primary/90 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
                Ir al Visor CAD para Cargar Plano DXF
              </button>
            </div>
          )}

          {/* ── Barra de Distribución Porcentual ────────────────────────── */}
          {report.categorias.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Distribución de Superficie (m²)
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  100% = {report.total_area_m2.toLocaleString()} m²
                </span>
              </div>

              {/* Barra Progresiva Multi-Color */}
              <div className="h-4 w-full bg-secondary rounded-full overflow-hidden flex shadow-inner">
                {report.categorias
                  .filter((c) => c.porcentaje_area > 0)
                  .map((cat) => {
                    const style = CATEGORY_COLORS[cat.tipo] || CATEGORY_COLORS.DEFAULT;
                    return (
                      <div
                        key={cat.tipo}
                        style={{ width: `${cat.porcentaje_area}%` }}
                        className={cn("h-full transition-all duration-300", style.bar)}
                        title={`${cat.label}: ${cat.area_total_m2} m² (${cat.porcentaje_area}%)`}
                      />
                    );
                  })}
              </div>

              {/* Leyenda rápida porcentual */}
              <div className="flex flex-wrap gap-3 pt-1">
                {report.categorias
                  .filter((c) => c.porcentaje_area > 0)
                  .slice(0, 7)
                  .map((cat) => {
                    const style = CATEGORY_COLORS[cat.tipo] || CATEGORY_COLORS.DEFAULT;
                    return (
                      <div key={cat.tipo} className="flex items-center gap-1.5 text-xs font-medium">
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", style.bar)} />
                        <span className="text-muted-foreground">{cat.label}:</span>
                        <span className="font-mono font-bold text-foreground">{cat.porcentaje_area}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── Desglose por Categoria ──────────────────────────────────── */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Desglose por Tipo de Espacio
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {report.categorias.map((cat) => {
                const style = CATEGORY_COLORS[cat.tipo] || CATEGORY_COLORS.DEFAULT;
                return (
                  <div
                    key={cat.tipo}
                    onClick={() => setSelectedCatFilter(selectedCatFilter === cat.tipo ? null : cat.tipo)}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all cursor-pointer select-none relative overflow-hidden",
                      style.bg,
                      style.border,
                      selectedCatFilter === cat.tipo ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold truncate", style.text)}>
                        {cat.label}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-card/80 border border-border">
                        {cat.cantidad} {cat.cantidad === 1 ? "unidad" : "unidades"}
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <div>
                        <span className="text-lg font-extrabold text-foreground font-mono tabular-nums">
                          {cat.area_total_m2.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">m²</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-muted-foreground">
                        {cat.porcentaje_area}% del total
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Tabla de Ambientes / Recintos Detallados ───────────────── */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Listado de Recintos ({filteredItems.length})
                </span>
                {selectedCatFilter && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Filtrado por: {selectedCatFilter}
                    <button onClick={() => setSelectedCatFilter(null)} className="ml-1 text-xs hover:text-destructive">
                      ×
                    </button>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Buscar */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar sala, oficina, lab…"
                    className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Exportar CSV */}
                <button
                  onClick={exportToCSV}
                  className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-lg border border-border transition-colors flex items-center gap-1.5 shrink-0"
                  title="Exportar listado completo a Excel/CSV"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  Exportar CSV
                </button>
              </div>
            </div>

            {/* Tabla responsive */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/50 text-muted-foreground font-semibold sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="p-2.5 rounded-l-lg">Nombre / Código</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Capa DXF</th>
                    <th className="p-2.5 font-mono text-right">Superficie (m²)</th>
                    <th className="p-2.5 font-mono text-right">Perímetro (m)</th>
                    <th className="p-2.5 rounded-r-lg">Ubicación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No se encontraron recintos con los criterios de búsqueda seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                        <td className="p-2.5 font-semibold text-foreground">
                          {item.nombre || <span className="text-muted-foreground italic font-normal">Sin nombre</span>}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary border border-border">
                            {item.tipo}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-muted-foreground text-[11px]">
                          {item.capa || "-"}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-right text-foreground">
                          {item.area_m2 ? `${item.area_m2.toFixed(1)} m²` : "-"}
                        </td>
                        <td className="p-2.5 font-mono text-right text-muted-foreground">
                          {item.perimetro_m ? `${item.perimetro_m.toFixed(1)} m` : "-"}
                        </td>
                        <td className="p-2.5 text-muted-foreground text-[11px]">
                          {item.sede_nombre} · {item.edificio_nombre} · {item.piso_nombre}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
