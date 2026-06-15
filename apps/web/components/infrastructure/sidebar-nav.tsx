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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadDxf = (pisoId: string) => {
    setUploadTargetPisoId(pisoId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetPisoId || !authToken) return;
    if (!file.name.endsWith(".dxf")) {
      alert("Solo se aceptan archivos .dxf");
      return;
    }

    setUploading(true);
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
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      } else {
        const data = await res.json();
        alert(`✓ ${data.mensaje}`);
        // Recargar el árbol y el piso activo
        await refreshTree();
        if (uploadTargetPisoId) {
          await selectPiso(uploadTargetPisoId, authToken);
        }
      }
    } catch {
      alert("Error al subir el archivo");
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
        <div className="px-2 py-1.5 text-xs text-primary flex items-center gap-1.5">
          <UploadCloud className="w-3.5 h-3.5 animate-bounce" />
          Procesando DXF…
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
