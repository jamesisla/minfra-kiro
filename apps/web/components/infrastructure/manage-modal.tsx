"use client";

/**
 * Modal para crear Sedes, Edificios y Pisos.
 * Se abre desde botones en la sidebar con "+" cuando el árbol está vacío.
 */

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useInfrastructureStore } from "@/lib/stores/infrastructure-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type CreatingType = "sede" | "edificio" | "piso" | null;

export function ManagePanel() {
  const { tree, authToken, refreshTree } = useInfrastructureStore();
  const [creating, setCreating] = useState<CreatingType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [direccion, setDireccion] = useState("");
  const [codigo, setCodigo] = useState("");
  const [selectedSedeId, setSelectedSedeId] = useState("");
  const [selectedEdificioId, setSelectedEdificioId] = useState("");
  const [pisoNumero, setPisoNumero] = useState("1");

  const reset = () => {
    setCreating(null);
    setNombre("");
    setDescripcion("");
    setDireccion("");
    setCodigo("");
    setSelectedSedeId("");
    setSelectedEdificioId("");
    setPisoNumero("1");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!authToken || !nombre.trim()) return;
    setLoading(true);
    setError(null);
    try {
      let url = "";
      let body: Record<string, unknown> = {};

      if (creating === "sede") {
        url = `${API_URL}/api/v1/infrastructure/sedes`;
        body = { nombre, descripcion: descripcion || null, direccion: direccion || null };
      } else if (creating === "edificio") {
        if (!selectedSedeId) { setError("Selecciona una sede"); setLoading(false); return; }
        url = `${API_URL}/api/v1/infrastructure/edificios`;
        body = { nombre, codigo: codigo || null, descripcion: descripcion || null, sede_id: selectedSedeId };
      } else if (creating === "piso") {
        if (!selectedEdificioId) { setError("Selecciona un edificio"); setLoading(false); return; }
        url = `${API_URL}/api/v1/infrastructure/pisos`;
        body = { numero: parseInt(pisoNumero, 10), nombre: nombre || null, edificio_id: selectedEdificioId };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Error al crear");
      }

      await refreshTree();
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  // Obtener edificios de una sede seleccionada
  const edificiosDeSede = tree?.sedes
    .find((s) => s.id === selectedSedeId)
    ?.edificios ?? [];

  return (
    <div className="border-t border-border p-3 space-y-2">
      {/* Botones de creación */}
      {!creating && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
            Agregar
          </p>
          <button
            onClick={() => setCreating("sede")}
            className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-secondary transition-colors text-left"
          >
            <Plus className="w-3 h-3" /> Sede
          </button>
          <button
            onClick={() => setCreating("edificio")}
            className={cn(
              "flex items-center gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-secondary transition-colors text-left",
              (!tree || tree.sedes.length === 0) && "opacity-40 pointer-events-none"
            )}
          >
            <Plus className="w-3 h-3" /> Edificio
          </button>
          <button
            onClick={() => setCreating("piso")}
            className={cn(
              "flex items-center gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-secondary transition-colors text-left",
              (!tree || tree.sedes.every((s) => s.edificios.length === 0)) &&
                "opacity-40 pointer-events-none"
            )}
          >
            <Plus className="w-3 h-3" /> Piso
          </button>
        </div>
      )}

      {/* Formulario inline */}
      {creating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold capitalize">
              Nuevo {creating}
            </p>
            <button onClick={reset} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Campos comunes */}
          {creating !== "piso" ? (
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={`Nombre de la ${creating}`}
              className="w-full text-xs rounded border border-border bg-background px-2 py-1.5 outline-none focus:border-primary"
            />
          ) : (
            <div className="flex gap-2">
              <input
                value={pisoNumero}
                onChange={(e) => setPisoNumero(e.target.value)}
                placeholder="Nro."
                type="number"
                className="w-16 text-xs rounded border border-border bg-background px-2 py-1.5 outline-none focus:border-primary"
              />
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre (opcional)"
                className="flex-1 text-xs rounded border border-border bg-background px-2 py-1.5 outline-none focus:border-primary"
              />
            </div>
          )}

          {creating === "sede" && (
            <>
              <input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Dirección (opcional)"
                className="w-full text-xs rounded border border-border bg-background px-2 py-1.5 outline-none focus:border-primary"
              />
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción (opcional)"
                className="w-full text-xs rounded border border-border bg-background px-2 py-1.5 outline-none focus:border-primary"
              />
            </>
          )}

          {creating === "edificio" && (
            <>
              <select
                value={selectedSedeId}
                onChange={(e) => setSelectedSedeId(e.target.value)}
                className="w-full text-xs rounded border border-border bg-background px-2 py-1.5 outline-none focus:border-primary"
              >
                <option value="">Seleccionar sede…</option>
                {tree?.sedes.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Código (ej: A, B1)"
                className="w-full text-xs rounded border border-border bg-background px-2 py-1.5 outline-none focus:border-primary"
              />
            </>
          )}

          {creating === "piso" && (
            <>
              <select
                value={selectedSedeId}
                onChange={(e) => { setSelectedSedeId(e.target.value); setSelectedEdificioId(""); }}
                className="w-full text-xs rounded border border-border bg-background px-2 py-1.5 outline-none focus:border-primary"
              >
                <option value="">Seleccionar sede…</option>
                {tree?.sedes.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
              {selectedSedeId && (
                <select
                  value={selectedEdificioId}
                  onChange={(e) => setSelectedEdificioId(e.target.value)}
                  className="w-full text-xs rounded border border-border bg-background px-2 py-1.5 outline-none focus:border-primary"
                >
                  <option value="">Seleccionar edificio…</option>
                  {edificiosDeSede.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              )}
            </>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading || !nombre.trim()}
            size="sm"
            className="w-full text-xs h-7"
          >
            {loading ? "Guardando…" : "Crear"}
          </Button>
        </div>
      )}
    </div>
  );
}
