"use client";

import { ChevronRight, Building2, Layers, Map, MapPin, Plus, UploadCloud } from "lucide-react";
import { useInfrastructureStore } from "@/lib/stores/infrastructure-store";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
        // Recargar el árbol y el piso activo
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
    <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto h-full">
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

      {tree.sedes.map((sede) => {
        const sedeExpanded = expandedSedes.has(sede.id);
        const sedeSelected = selectedSedeId === sede.id;

        return (
          <div key={sede.id}>
            {/* Sede */}
            <button
              onClick={() => {
                toggleSedeExpand(sede.id);
                selectSede(sede.id);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                sedeSelected
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-secondary text-foreground"
              )}
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

            {/* Edificios */}
            {sedeExpanded && (
              <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                {sede.edificios.map((edificio) => {
                  const edExpanded = expandedEdificios.has(edificio.id);
                  const edSelected = selectedEdificioId === edificio.id;

                  return (
                    <div key={edificio.id}>
                      <button
                        onClick={() => {
                          toggleEdificioExpand(edificio.id);
                          selectEdificio(edificio.id);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                          edSelected
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-secondary text-foreground"
                        )}
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
                          <span className="ml-auto text-xs text-muted-foreground shrink-0">
                            {edificio.codigo}
                          </span>
                        )}
                      </button>

                      {/* Pisos */}
                      {edExpanded && (
                        <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                          {edificio.pisos.map((piso) => {
                            const pisoSelected = selectedPisoId === piso.id;
                            const label =
                              piso.nombre ??
                              (piso.numero === 0
                                ? "Planta baja"
                                : piso.numero < 0
                                ? `Subsuelo ${Math.abs(piso.numero)}`
                                : `Piso ${piso.numero}`);

                            return (
                              <div
                                key={piso.id}
                                className={cn(
                                  "flex items-center gap-1 rounded-md transition-colors",
                                  pisoSelected ? "bg-primary/10" : "hover:bg-secondary"
                                )}
                              >
                                <button
                                  onClick={() => authToken && selectPiso(piso.id, authToken)}
                                  className={cn(
                                    "flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-left",
                                    pisoSelected ? "text-primary font-medium" : "text-foreground"
                                  )}
                                >
                                  <Layers className="w-3.5 h-3.5 shrink-0 text-emerald-500/80" />
                                  <span className="truncate">{label}</span>
                                  {piso.tiene_plano && (
                                    <Map className="w-3 h-3 shrink-0 text-emerald-500" title="Tiene plano cargado" />
                                  )}
                                </button>
                                {/* Botón subir DXF */}
                                <button
                                  onClick={() => handleUploadDxf(piso.id)}
                                  className="p-1 mr-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  title="Cargar plano DXF"
                                >
                                  <UploadCloud className="w-3.5 h-3.5" />
                                </button>
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
