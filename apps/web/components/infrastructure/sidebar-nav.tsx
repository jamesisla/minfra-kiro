"use client";

import { useRef, useState } from "react";
import {
  ChevronRight,
  Building2,
  Layers,
  Map,
  MapPin,
  UploadCloud,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useInfrastructureStore } from "@/lib/stores/infrastructure-store";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type EditTarget = {
  type: "sede" | "edificio" | "piso";
  id: string;
  nombre: string;
  codigo?: string;
  numero?: number;
};

type DeleteTarget = {
  type: "sede" | "edificio" | "piso";
  id: string;
  nombre: string;
};

export function SidebarNav() {
  const {
    tree,
    treeLoading,
    treeError,
    selectedSedeId,
    selectedEdificioId,
    selectedPisoId,
    expandedSedes,
    expandedEdificios,
    authToken,
    toggleSedeExpand,
    toggleEdificioExpand,
    selectSede,
    selectEdificio,
    selectPiso,
    refreshTree,
  } = useInfrastructureStore();

  const [uploading, setUploading] = useState(false);
  const [uploadTargetPisoId, setUploadTargetPisoId] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit and Delete States
  const [editingItem, setEditingItem] = useState<EditTarget | null>(null);
  const [deletingItem, setDeletingItem] = useState<DeleteTarget | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form values for editing
  const [editNombre, setEditNombre] = useState("");
  const [editCodigo, setEditCodigo] = useState("");
  const [editNumero, setEditNumero] = useState(0);

  const startEdit = (target: EditTarget) => {
    setEditingItem(target);
    setEditNombre(target.nombre);
    setEditCodigo(target.codigo ?? "");
    setEditNumero(target.numero ?? 0);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !authToken) return;
    setActionLoading(true);
    try {
      if (editingItem.type === "sede") {
        await apiClient.patch(
          `/api/v1/infrastructure/sedes/${editingItem.id}`,
          { nombre: editNombre.trim() },
          { token: authToken }
        );
      } else if (editingItem.type === "edificio") {
        await apiClient.patch(
          `/api/v1/infrastructure/edificios/${editingItem.id}`,
          { nombre: editNombre.trim(), codigo: editCodigo.trim() || null },
          { token: authToken }
        );
      } else if (editingItem.type === "piso") {
        await apiClient.patch(
          `/api/v1/infrastructure/pisos/${editingItem.id}`,
          { nombre: editNombre.trim() || null, numero: editNumero },
          { token: authToken }
        );
      }
      await refreshTree();
      setEditingItem(null);
    } catch (err) {
      console.error("Error al guardar cambios:", err);
      setUploadNotice({ type: "error", text: "Error al guardar los cambios" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem || !authToken) return;
    setActionLoading(true);
    try {
      if (deletingItem.type === "sede") {
        await apiClient.delete(`/api/v1/infrastructure/sedes/${deletingItem.id}`, {
          token: authToken,
        });
      } else if (deletingItem.type === "edificio") {
        await apiClient.delete(`/api/v1/infrastructure/edificios/${deletingItem.id}`, {
          token: authToken,
        });
      } else if (deletingItem.type === "piso") {
        await apiClient.delete(`/api/v1/infrastructure/pisos/${deletingItem.id}`, {
          token: authToken,
        });
      }
      await refreshTree();
      setDeletingItem(null);
    } catch (err) {
      console.error("Error al eliminar elemento:", err);
      setUploadNotice({ type: "error", text: "Error al eliminar el elemento" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadDxf = (pisoId: string) => {
    setUploadTargetPisoId(pisoId);
    setUploadNotice(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetPisoId || !authToken) return;
    if (!file.name.toLowerCase().endsWith(".dxf")) {
      setUploadNotice({ type: "error", text: "Solo se aceptan archivos de plano .dxf" });
      return;
    }

    setUploading(true);
    setUploadNotice(null);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(
        `${API_URL}/api/v1/infrastructure/pisos/${uploadTargetPisoId}/upload-dxf`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: form,
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Error al procesar el archivo DXF" }));
        setUploadNotice({ type: "error", text: err.detail ?? "Error al procesar DXF" });
      } else {
        const data = await res.json();
        setUploadNotice({ type: "success", text: data.mensaje || "Plano DXF cargado con éxito" });
        await refreshTree();
        if (uploadTargetPisoId) {
          await selectPiso(uploadTargetPisoId, authToken);
        }
      }
    } catch {
      setUploadNotice({ type: "error", text: "Error de red al subir el archivo DXF" });
    } finally {
      setUploading(false);
      setUploadTargetPisoId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (treeLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 rounded bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (treeError) {
    return (
      <div className="p-4 text-sm text-destructive">
        <p>Error al cargar la estructura</p>
        <button onClick={refreshTree} className="mt-2 text-xs underline">
          Reintentar
        </button>
      </div>
    );
  }

  if (!tree || tree.sedes.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        <p>No hay sedes registradas.</p>
      </div>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto h-full relative">
      {/* Input oculto para subir DXF */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dxf"
        className="hidden"
        onChange={handleFileChange}
      />

      {uploading && (
        <div className="px-2 py-1.5 text-xs text-primary flex items-center gap-1.5 bg-primary/10 rounded my-1 mx-2">
          <UploadCloud className="w-3.5 h-3.5 animate-bounce" />
          Procesando DXF…
        </div>
      )}

      {uploadNotice && (
        <div
          className={cn(
            "mx-2 my-1 px-2 py-1.5 rounded text-xs flex items-center justify-between gap-1",
            uploadNotice.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          )}
        >
          <span>{uploadNotice.text}</span>
          <button
            onClick={() => setUploadNotice(null)}
            className="opacity-70 hover:opacity-100 font-bold ml-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Confirmation Dialog para Eliminar */}
      {deletingItem && (
        <div className="mx-2 my-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs space-y-2 animate-in fade-in-0">
          <div className="flex items-center gap-1.5 text-destructive font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>¿Eliminar {deletingItem.type}?</span>
          </div>
          <p className="text-muted-foreground">
            Se eliminará "<strong>{deletingItem.nombre}</strong>" y todos sus elementos contenidos.
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setDeletingItem(null)}
              className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={actionLoading}
              className="px-2 py-1 rounded bg-destructive text-destructive-foreground font-medium flex items-center gap-1 hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      )}

      {tree.sedes.map((sede) => {
        const sedeExpanded = expandedSedes.has(sede.id);
        const sedeSelected = selectedSedeId === sede.id;
        const isEditingSede = editingItem?.type === "sede" && editingItem.id === sede.id;

        return (
          <div key={sede.id} className="group/sede">
            {/* Sede */}
            {isEditingSede ? (
              <div className="flex items-center gap-1 px-2 py-1 my-0.5 bg-secondary/80 rounded-md">
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="flex-1 bg-background border border-border rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveEdit}
                  disabled={actionLoading}
                  className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-muted-foreground hover:bg-secondary rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className={cn(
                  "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                  sedeSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-secondary text-foreground"
                )}
              >
                <button
                  onClick={() => {
                    toggleSedeExpand(sede.id);
                    selectSede(sede.id);
                  }}
                  className="flex-1 flex items-center gap-2 min-w-0"
                >
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 shrink-0 transition-transform text-muted-foreground",
                      sedeExpanded && "rotate-90"
                    )}
                  />
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/80" />
                  <span className="truncate">{sede.nombre}</span>
                </button>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => startEdit({ type: "sede", id: sede.id, nombre: sede.nombre })}
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded"
                    title="Editar Sede"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setDeletingItem({ type: "sede", id: sede.id, nombre: sede.nombre })}
                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                    title="Eliminar Sede"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Edificios */}
            {sedeExpanded && (
              <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                {sede.edificios.map((edificio) => {
                  const edExpanded = expandedEdificios.has(edificio.id);
                  const edSelected = selectedEdificioId === edificio.id;
                  const isEditingEdificio =
                    editingItem?.type === "edificio" && editingItem.id === edificio.id;

                  return (
                    <div key={edificio.id} className="group/edificio">
                      {isEditingEdificio ? (
                        <div className="flex flex-col gap-1 p-1.5 my-0.5 bg-secondary/80 rounded-md">
                          <input
                            type="text"
                            value={editNombre}
                            onChange={(e) => setEditNombre(e.target.value)}
                            placeholder="Nombre edificio"
                            className="bg-background border border-border rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                            autoFocus
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editCodigo}
                              onChange={(e) => setEditCodigo(e.target.value)}
                              placeholder="Código (opcional)"
                              className="flex-1 bg-background border border-border rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                            />
                            <button
                              onClick={handleSaveEdit}
                              disabled={actionLoading}
                              className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingItem(null)}
                              className="p-1 text-muted-foreground hover:bg-secondary rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                            edSelected
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-secondary text-foreground"
                          )}
                        >
                          <button
                            onClick={() => {
                              toggleEdificioExpand(edificio.id);
                              selectEdificio(edificio.id);
                            }}
                            className="flex-1 flex items-center gap-2 min-w-0"
                          >
                            <ChevronRight
                              className={cn(
                                "w-3.5 h-3.5 shrink-0 transition-transform text-muted-foreground",
                                edExpanded && "rotate-90"
                              )}
                            />
                            <Building2 className="w-3.5 h-3.5 shrink-0 text-blue-500/80" />
                            <span className="truncate">{edificio.nombre}</span>
                            {edificio.codigo && (
                              <span className="text-[10px] bg-secondary border border-border font-mono px-1 rounded text-muted-foreground shrink-0">
                                {edificio.codigo}
                              </span>
                            )}
                          </button>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() =>
                                startEdit({
                                  type: "edificio",
                                  id: edificio.id,
                                  nombre: edificio.nombre,
                                  codigo: edificio.codigo ?? "",
                                })
                              }
                              className="p-1 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded"
                              title="Editar Edificio"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() =>
                                setDeletingItem({
                                  type: "edificio",
                                  id: edificio.id,
                                  nombre: edificio.nombre,
                                })
                              }
                              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                              title="Eliminar Edificio"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Pisos */}
                      {edExpanded && (
                        <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                          {edificio.pisos.map((piso) => {
                            const pisoSelected = selectedPisoId === piso.id;
                            const isEditingPiso =
                              editingItem?.type === "piso" && editingItem.id === piso.id;
                            const label =
                              piso.nombre ??
                              (piso.numero === 0
                                ? "Planta baja"
                                : piso.numero < 0
                                ? `Subsuelo ${Math.abs(piso.numero)}`
                                : `Piso ${piso.numero}`);

                            return (
                              <div key={piso.id} className="group/piso">
                                {isEditingPiso ? (
                                  <div className="flex items-center gap-1 p-1 my-0.5 bg-secondary/80 rounded-md">
                                    <input
                                      type="number"
                                      value={editNumero}
                                      onChange={(e) => setEditNumero(parseInt(e.target.value, 10) || 0)}
                                      placeholder="Nro"
                                      className="w-12 bg-background border border-border rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={editNombre}
                                      onChange={(e) => setEditNombre(e.target.value)}
                                      placeholder="Nombre (opcional)"
                                      className="flex-1 bg-background border border-border rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                                      autoFocus
                                    />
                                    <button
                                      onClick={handleSaveEdit}
                                      disabled={actionLoading}
                                      className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingItem(null)}
                                      className="p-1 text-muted-foreground hover:bg-secondary rounded"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    className={cn(
                                      "flex items-center justify-between gap-1 rounded-md transition-colors",
                                      pisoSelected ? "bg-primary/10" : "hover:bg-secondary"
                                    )}
                                  >
                                    <button
                                      onClick={() => authToken && selectPiso(piso.id, authToken)}
                                      className={cn(
                                        "flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-left min-w-0",
                                        pisoSelected ? "text-primary font-medium" : "text-foreground"
                                      )}
                                    >
                                      <Layers className="w-3.5 h-3.5 shrink-0 text-emerald-500/80" />
                                      <span className="truncate">{label}</span>
                                      {piso.tiene_plano && (
                                        <Map className="w-3 h-3 shrink-0 text-emerald-500" title="Tiene plano cargado" />
                                      )}
                                    </button>

                                    <div className="flex items-center gap-0.5 shrink-0 pr-1">
                                      <button
                                        onClick={() => handleUploadDxf(piso.id)}
                                        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                        title="Cargar plano DXF"
                                      >
                                        <UploadCloud className="w-3.5 h-3.5" />
                                      </button>

                                      <div className="flex items-center gap-0.5">
                                        <button
                                          onClick={() =>
                                            startEdit({
                                              type: "piso",
                                              id: piso.id,
                                              nombre: piso.nombre ?? "",
                                              numero: piso.numero,
                                            })
                                          }
                                          className="p-1 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded"
                                          title="Editar Piso"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            setDeletingItem({
                                              type: "piso",
                                              id: piso.id,
                                              nombre: label,
                                            })
                                          }
                                          className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                                          title="Eliminar Piso"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {edificio.pisos.length === 0 && (
                            <p className="px-2 py-1 text-xs text-muted-foreground">Sin pisos</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {sede.edificios.length === 0 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">Sin edificios</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
