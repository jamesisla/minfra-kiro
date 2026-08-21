"use client";

/**
 * Vista de Gestión Documental, Cumplimiento Normativo & Semáforo de Vigencias (Fase 3).
 * Provee un panel integral para auditar certificaciones SEC, pólizas, permisos de edificación
 * y títulos de dominio con alertas de vencimiento por niveles de urgencia.
 */

import { useEffect, useState, useMemo, useRef } from "react";
import {
  FileCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  RotateCw,
  FileText,
  Building,
  UploadCloud,
  X,
  Loader2,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import { useInfrastructureStore } from "@/lib/stores/infrastructure-store";
import { apiClient, getApiUrl } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { PdfPreviewModal } from "./pdf-preview-modal";
import { Documento, ComplianceAlertSummary, DocumentType, ExpirationStatus } from "@sdd/shared-types";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CERTIFICADO_SEC: "Certificado SEC (Gas/Eléctrico/Ascensor)",
  PERMISO_EDIFICACION: "Permiso de Edificación Municipal",
  TITULO_DOMINIO: "Título de Dominio / Escritura",
  POLIZA_SEGURO: "Póliza de Seguros",
  PROTOCOLO_BIOSEGURIDAD: "Protocolo de Bioseguridad",
  MANUAL_GARANTIA: "Manual de Operación & Garantía",
  PLANO_TECNICO: "Plano Técnico Especializado",
  INFORME_TECNICO: "Informe Técnico / Auditoría",
  OTRO: "Otro Documento",
};

const DOCUMENT_TYPE_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  CERTIFICADO_SEC: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  PERMISO_EDIFICACION: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  TITULO_DOMINIO: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  POLIZA_SEGURO: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  PROTOCOLO_BIOSEGURIDAD: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20" },
  MANUAL_GARANTIA: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/20" },
  PLANO_TECNICO: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20" },
  INFORME_TECNICO: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-500/20" },
  OTRO: { bg: "bg-zinc-500/10", text: "text-zinc-600 dark:text-zinc-400", border: "border-zinc-500/20" },
};

export function ComplianceView() {
  const { authToken, tree } = useInfrastructureStore();

  const [documents, setDocuments] = useState<Documento[]>([]);
  const [summary, setSummary] = useState<ComplianceAlertSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal Preview PDF
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null);

  // Modal Nuevo Documento
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formTipo, setFormTipo] = useState<string>("CERTIFICADO_SEC");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formEmisor, setFormEmisor] = useState("");
  const [formFolio, setFormFolio] = useState("");
  const [formEmision, setFormEmision] = useState("");
  const [formVencimiento, setFormVencimiento] = useState("");
  const [formSedeId, setFormSedeId] = useState("");
  const [formEdificioId, setFormEdificioId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchComplianceData = async () => {
    const token = authToken || (typeof window !== "undefined" ? localStorage.getItem("minfra-token") : null);
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const [docsData, summaryData] = await Promise.all([
        apiClient.get<Documento[]>("/api/v1/documents", { token }),
        apiClient.get<ComplianceAlertSummary>("/api/v1/documents/compliance/summary", { token }),
      ]);
      setDocuments(docsData || []);
      setSummary(summaryData || null);
    } catch (err: any) {
      console.error("Error al cargar compliance:", err);
      setError(err?.message || "Error al cargar los documentos de cumplimiento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, [authToken]);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = authToken || (typeof window !== "undefined" ? localStorage.getItem("minfra-token") : null);
    if (!token || !formNombre.trim()) return;

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("nombre", formNombre.trim());
      formData.append("tipo_documento", formTipo);
      if (formDescripcion.trim()) formData.append("descripcion", formDescripcion.trim());
      if (formEmisor.trim()) formData.append("emisor_entidad", formEmisor.trim());
      if (formFolio.trim()) formData.append("numero_folio", formFolio.trim());
      if (formEmision) formData.append("fecha_emision", formEmision);
      if (formVencimiento) formData.append("fecha_vencimiento", formVencimiento);
      if (formSedeId) formData.append("sede_id", formSedeId);
      if (formEdificioId) formData.append("edificio_id", formEdificioId);
      if (selectedFile) formData.append("file", selectedFile);

      const res = await fetch(`${getApiUrl()}/api/v1/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Error al subir documento" }));
        throw new Error(errorData.detail || "Error al registrar documento");
      }

      setShowUploadModal(false);
      // Reset form
      setFormNombre("");
      setFormTipo("CERTIFICADO_SEC");
      setFormDescripcion("");
      setFormEmisor("");
      setFormFolio("");
      setFormEmision("");
      setFormVencimiento("");
      setFormSedeId("");
      setFormEdificioId("");
      setSelectedFile(null);

      await fetchComplianceData();
    } catch (err: any) {
      console.error("Error subiendo documento:", err);
      alert(err.message || "Error al subir documento");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const token = authToken || (typeof window !== "undefined" ? localStorage.getItem("minfra-token") : null);
    if (!token) return;
    if (!confirm("¿Está seguro de que desea eliminar este documento?")) return;

    try {
      await apiClient.delete(`/api/v1/documents/${docId}`, { token });
      await fetchComplianceData();
    } catch (err) {
      console.error("Error eliminando documento:", err);
    }
  };

  // Filtrado reactivo de la tabla
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchType = typeFilter === "ALL" || doc.tipo_documento === typeFilter;
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "VENCIDO" && doc.estado_vencimiento === "VENCIDO") ||
        (statusFilter === "POR_VENCER" &&
          (doc.estado_vencimiento === "POR_VENCER_30" || doc.estado_vencimiento === "POR_VENCER_60")) ||
        (statusFilter === "VIGENTE" && doc.estado_vencimiento === "VIGENTE") ||
        (statusFilter === "SIN_VENCIMIENTO" && doc.estado_vencimiento === "SIN_VENCIMIENTO");

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        doc.nombre.toLowerCase().includes(q) ||
        (doc.numero_folio && doc.numero_folio.toLowerCase().includes(q)) ||
        (doc.emisor_entidad && doc.emisor_entidad.toLowerCase().includes(q)) ||
        (doc.entidad_asociada_nombre && doc.entidad_asociada_nombre.toLowerCase().includes(q)) ||
        (doc.archivo_nombre && doc.archivo_nombre.toLowerCase().includes(q));

      return matchType && matchStatus && matchSearch;
    });
  }, [documents, typeFilter, statusFilter, searchQuery]);

  const edificiosDeSede = useMemo(() => {
    if (!formSedeId || !tree?.sedes) return [];
    return tree.sedes.find((s) => s.id === formSedeId)?.edificios || [];
  }, [formSedeId, tree]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background/50 p-4 md:p-6 space-y-6">
      {/* ── Encabezado Principal ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-500" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Documentos & Compliance Institucional
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestor de certificados SEC, pólizas, permisos de edificación y semáforo de vigencias
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchComplianceData}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Actualizar semáforos"
          >
            <RotateCw className={cn("w-3.5 h-3.5 text-primary", loading && "animate-spin")} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Documento</span>
          </button>
        </div>
      </div>

      {/* ── KPI Cards (Semáforo de Vigencias) ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total */}
        <div
          onClick={() => setStatusFilter("ALL")}
          className={cn(
            "bg-card border rounded-xl p-3.5 shadow-sm cursor-pointer transition-all hover:shadow-md",
            statusFilter === "ALL" ? "border-primary ring-2 ring-primary/20" : "border-border"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Registros</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-foreground mt-2 font-mono tabular-nums">
            {summary?.total_documentos ?? 0}
          </p>
          <span className="text-[10px] text-muted-foreground mt-1 block">Documentos archivados</span>
        </div>

        {/* Vigentes (Verde) */}
        <div
          onClick={() => setStatusFilter("VIGENTE")}
          className={cn(
            "bg-emerald-500/5 border rounded-xl p-3.5 shadow-sm cursor-pointer transition-all hover:shadow-md",
            statusFilter === "VIGENTE" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-emerald-500/30"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Vigentes (Al día)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-mono tabular-nums">
            {summary?.vigentes ?? 0}
          </p>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 block">
            Cumplimiento conforme
          </span>
        </div>

        {/* Por Vencer ≤ 60d (Amarillo) */}
        <div
          onClick={() => setStatusFilter("POR_VENCER")}
          className={cn(
            "bg-amber-500/5 border rounded-xl p-3.5 shadow-sm cursor-pointer transition-all hover:shadow-md",
            statusFilter === "POR_VENCER" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-amber-500/30"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Por Vencer (≤60 días)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 font-mono tabular-nums">
            {(summary?.por_vencer_60 ?? 0) + (summary?.por_vencer_30 ?? 0)}
          </p>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-1 block">
            Renovación requerida
          </span>
        </div>

        {/* Vencidos (Rojo) */}
        <div
          onClick={() => setStatusFilter("VENCIDO")}
          className={cn(
            "bg-red-500/5 border rounded-xl p-3.5 shadow-sm cursor-pointer transition-all hover:shadow-md",
            statusFilter === "VENCIDO" ? "border-red-500 ring-2 ring-red-500/20" : "border-red-500/30"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-700 dark:text-red-300">Vencidos (Críticos)</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-2 font-mono tabular-nums">
            {summary?.vencidos ?? 0}
          </p>
          <span className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-1 block">
            ¡Acción inmediata!
          </span>
        </div>

        {/* Sin Vencimiento */}
        <div
          onClick={() => setStatusFilter("SIN_VENCIMIENTO")}
          className={cn(
            "bg-card border rounded-xl p-3.5 shadow-sm cursor-pointer transition-all hover:shadow-md",
            statusFilter === "SIN_VENCIMIENTO" ? "border-primary ring-2 ring-primary/20" : "border-border"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Sin Vencimiento</span>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-extrabold text-foreground mt-2 font-mono tabular-nums">
            {summary?.sin_vencimiento ?? 0}
          </p>
          <span className="text-[10px] text-muted-foreground mt-1 block">Títulos y planos fijos</span>
        </div>
      </div>

      {/* ── Barra de Alerta si existen documentos vencidos ──────────────── */}
      {(summary?.vencidos ?? 0) > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 text-red-800 dark:text-red-200">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">¡Atención de Cumplimiento! </span>
              Se detectaron <strong>{summary?.vencidos} documentos vencidos</strong> que requieren renovación legal o técnica prioritaria para auditorías.
            </div>
          </div>
          <button
            onClick={() => setStatusFilter("VENCIDO")}
            className="px-3 py-1 bg-red-600 text-white font-bold rounded-lg text-xs hover:bg-red-700 shrink-0 shadow-sm transition-colors"
          >
            Ver Vencidos
          </button>
        </div>
      )}

      {/* ── Filtros y Búsqueda ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Barra de búsqueda */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, folio, emisor o edificio…"
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Filtro por Categoría */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-background border border-border text-foreground text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            >
              <option value="ALL">Todas las Categorías</option>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>

            {/* Filtro por Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-background border border-border text-foreground text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="VIGENTE">Vigente (Al día)</option>
              <option value="POR_VENCER">Por Vencer (≤60 días)</option>
              <option value="VENCIDO">Vencido (Alerta)</option>
              <option value="SIN_VENCIMIENTO">Sin Vencimiento</option>
            </select>
          </div>
        </div>

        {/* ── Tabla de Documentos ────────────────────────────────────────── */}
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto border border-border/80 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/70 text-muted-foreground font-semibold sticky top-0 backdrop-blur-md">
              <tr>
                <th className="p-3">Documento & Folio</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Asociado a</th>
                <th className="p-3">Emisor / Entidad</th>
                <th className="p-3">Vencimiento</th>
                <th className="p-3">Semáforo</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Cargando repositorio documental…
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    No se encontraron documentos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const typeStyle = DOCUMENT_TYPE_BADGES[doc.tipo_documento] || DOCUMENT_TYPE_BADGES.OTRO;
                  return (
                    <tr key={doc.id} className="hover:bg-secondary/40 transition-colors">
                      {/* Nombre & Folio */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate max-w-xs">{doc.nombre}</p>
                            {doc.numero_folio && (
                              <p className="text-[10px] font-mono text-muted-foreground">Folio: {doc.numero_folio}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded text-[10px] font-bold border",
                            typeStyle.bg,
                            typeStyle.text,
                            typeStyle.border
                          )}
                        >
                          {DOCUMENT_TYPE_LABELS[doc.tipo_documento] || doc.tipo_documento}
                        </span>
                      </td>

                      {/* Asociado a */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Building className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground text-[11px] truncate max-w-[150px]">
                            {doc.entidad_asociada_nombre || "Institucional"}
                          </span>
                        </div>
                        {doc.entidad_asociada_tipo && (
                          <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block ml-4">
                            Nivel: {doc.entidad_asociada_tipo}
                          </span>
                        )}
                      </td>

                      {/* Emisor */}
                      <td className="p-3 text-muted-foreground text-[11px]">
                        {doc.emisor_entidad || <span className="italic text-muted-foreground/60">-</span>}
                      </td>

                      {/* Fecha de Vencimiento */}
                      <td className="p-3 font-mono text-[11px] text-foreground">
                        {doc.fecha_vencimiento || <span className="text-muted-foreground font-sans">No vence</span>}
                      </td>

                      {/* Semáforo */}
                      <td className="p-3">
                        {doc.estado_vencimiento === "VIGENTE" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Vigente
                          </span>
                        )}
                        {doc.estado_vencimiento === "POR_VENCER_60" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Vence en {doc.dias_para_vencer}d
                          </span>
                        )}
                        {doc.estado_vencimiento === "POR_VENCER_30" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 animate-pulse">
                            <Clock className="w-3 h-3" />
                            ¡Vence en {doc.dias_para_vencer}d!
                          </span>
                        )}
                        {doc.estado_vencimiento === "VENCIDO" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Vencido ({Math.abs(doc.dias_para_vencer || 0)}d)
                          </span>
                        )}
                        {doc.estado_vencimiento === "SIN_VENCIMIENTO" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground border border-border">
                            Permanente
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {doc.archivo_path && (
                            <>
                              <button
                                onClick={() => setPreviewDoc(doc)}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                title="Ver archivo / Previsualizar PDF"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={`${getApiUrl()}/api/v1/documents/${doc.id}/file`}
                                download={doc.archivo_nombre || "documento.pdf"}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                title="Descargar archivo"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Eliminar documento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal de Creación / Subida de Documentos ────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0">
          <div className="bg-background border border-border rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-foreground">Registrar Nuevo Documento / Certificado</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3.5 text-xs">
              {/* Nombre */}
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Nombre del Documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej: Certificado SEC de Ascensores - Torre Central"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Categoría & Folio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Categoría / Tipo</label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Número de Folio / Código</label>
                  <input
                    type="text"
                    value={formFolio}
                    onChange={(e) => setFormFolio(e.target.value)}
                    placeholder="Ej: SEC-2026-998"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Emisor */}
              <div>
                <label className="block font-bold text-foreground mb-1">Organismo Emisor / Entidad</label>
                <input
                  type="text"
                  value={formEmisor}
                  onChange={(e) => setFormEmisor(e.target.value)}
                  placeholder="Ej: Superintendencia de Electricidad y Combustibles (SEC)"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Fechas: Emisión & Vencimiento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Fecha de Emisión</label>
                  <input
                    type="date"
                    value={formEmision}
                    onChange={(e) => setFormEmision(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">
                    Fecha de Vencimiento <span className="text-muted-foreground font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="date"
                    value={formVencimiento}
                    onChange={(e) => setFormVencimiento(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Asociación a Sede / Edificio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Asociar a Sede</label>
                  <select
                    value={formSedeId}
                    onChange={(e) => {
                      setFormSedeId(e.target.value);
                      setFormEdificioId("");
                    }}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">A nivel institucional (General)</option>
                    {tree?.sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Asociar a Edificio</label>
                  <select
                    value={formEdificioId}
                    disabled={!formSedeId}
                    onChange={(e) => setFormEdificioId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Toda la sede</option>
                    {edificiosDeSede.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Archivo adjunto */}
              <div>
                <label className="block font-bold text-foreground mb-1">Archivo Adjunto (PDF o Imagen)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-4 text-center cursor-pointer bg-card/50 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                    }}
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary font-bold text-xs">
                      <FileText className="w-4 h-4" />
                      <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud className="w-6 h-6 text-muted-foreground mx-auto" />
                      <p className="text-xs font-semibold text-foreground">Haga clic para seleccionar archivo</p>
                      <p className="text-[10px] text-muted-foreground">Formatos compatibles: PDF, PNG, JPG</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block font-bold text-foreground mb-1">Observaciones / Descripción</label>
                <textarea
                  rows={2}
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Detalles sobre el certificado o la vigencia..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-muted-foreground hover:bg-secondary text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading || !formNombre.trim()}
                  className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  {uploadLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando…</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Guardar Documento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Visor PDF ───────────────────────────────────────────── */}
      {previewDoc && (
        <PdfPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.nombre}
          fileUrl={`${getApiUrl()}/api/v1/documents/${previewDoc.id}/file`}
          fileName={previewDoc.archivo_nombre}
          mimeType={previewDoc.archivo_mime_type}
        />
      )}
    </div>
  );
}
