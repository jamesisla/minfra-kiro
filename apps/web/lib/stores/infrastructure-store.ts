/**
 * Store Zustand para el estado de la aplicación de infraestructura.
 * Maneja la navegación sede → edificio → piso y el visor de planos.
 */
import { create } from "zustand";
import { apiClient } from "@/lib/api/client";

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface PisoTreeItem {
  id: string;
  numero: number;
  nombre: string | null;
  tiene_plano: boolean;
}

export interface EdificioTreeItem {
  id: string;
  nombre: string;
  codigo: string | null;
  pisos: PisoTreeItem[];
}

export interface SedeTreeItem {
  id: string;
  nombre: string;
  edificios: EdificioTreeItem[];
}

export interface InfrastructureTree {
  sedes: SedeTreeItem[];
}

export interface PlanoItem {
  id: string;
  tipo: string;
  nombre: string | null;
  capa: string | null;
  x: number | null;
  y: number | null;
  ancho: number | null;
  alto: number | null;
  metadata_extra: string | null;
  espacio_id?: string | null;
}

export interface PisoDetail {
  id: string;
  numero: number;
  nombre: string | null;
  edificio_id: string;
  archivo_dxf: string | null;
  svg_data: string | null;
  items: PlanoItem[];
  min_x: number | null;
  min_y: number | null;
  max_x: number | null;
  max_y: number | null;
}

// ── Store ──────────────────────────────────────────────────────────────────

interface InfrastructureState {
  // Árbol de navegación
  tree: InfrastructureTree | null;
  treeLoading: boolean;
  treeError: string | null;

  // Navegación actual
  selectedSedeId: string | null;
  selectedEdificioId: string | null;
  selectedPisoId: string | null;

  // Nodos expandidos en el sidebar
  expandedSedes: Set<string>;
  expandedEdificios: Set<string>;

  // Piso activo con detalle + SVG
  activePiso: PisoDetail | null;
  pisoLoading: boolean;
  pisoError: string | null;

  // Item seleccionado en el visor
  selectedItem: PlanoItem | null;
  selectedItemPosition: { x: number; y: number } | null;

  // Pestaña activa (Visor CAD vs Reportes vs Compliance)
  activeTab: "viewer" | "reports" | "compliance";
  setActiveTab: (tab: "viewer" | "reports" | "compliance") => void;

  // Acciones
  setAuthToken: (token: string | null) => void;
  fetchTree: (token: string) => Promise<void>;
  selectSede: (id: string) => void;
  selectEdificio: (id: string) => void;
  selectPiso: (id: string, token: string) => Promise<void>;
  toggleSedeExpand: (id: string) => void;
  toggleEdificioExpand: (id: string) => void;
  setSelectedItem: (item: PlanoItem | null, position?: { x: number; y: number }) => void;
  clearSelectedItem: () => void;
  updatePlanoItem: (itemId: string, data: Partial<PlanoItem>) => Promise<void>;
  refreshTree: () => Promise<void>;
}

export const useInfrastructureStore = create<InfrastructureState>((set, get) => ({
  tree: null,
  treeLoading: false,
  treeError: null,
  selectedSedeId: null,
  selectedEdificioId: null,
  selectedPisoId: null,
  expandedSedes: new Set(),
  expandedEdificios: new Set(),
  activePiso: null,
  pisoLoading: false,
  pisoError: null,
  selectedItem: null,
  selectedItemPosition: null,
  authToken: null,
  activeTab: "viewer",

  setActiveTab: (tab) => set({ activeTab: tab }),
  setAuthToken: (token) => set({ authToken: token }),

  fetchTree: async (token: string) => {
    set({ treeLoading: true, treeError: null });
    try {
      const data = await apiClient.get<InfrastructureTree>("/api/v1/infrastructure/tree", { token });
      
      // Validar si los elementos seleccionados previamente aún existen en la base de datos
      const currentState = get();
      let sedeStillExists = false;
      let edificioStillExists = false;
      let pisoStillExists = false;

      if (data && Array.isArray(data.sedes)) {
        for (const s of data.sedes) {
          if (s.id === currentState.selectedSedeId) sedeStillExists = true;
          for (const e of s.edificios || []) {
            if (e.id === currentState.selectedEdificioId) edificioStillExists = true;
            for (const p of e.pisos || []) {
              if (p.id === currentState.selectedPisoId) pisoStillExists = true;
            }
          }
        }
      }

      set({
        tree: data,
        treeLoading: false,
        selectedSedeId: sedeStillExists ? currentState.selectedSedeId : null,
        selectedEdificioId: edificioStillExists ? currentState.selectedEdificioId : null,
        selectedPisoId: pisoStillExists ? currentState.selectedPisoId : null,
        activePiso: pisoStillExists ? currentState.activePiso : null,
        selectedItem: pisoStillExists ? currentState.selectedItem : null,
      });

      // Auto-expandir la primera sede si hay sólo una
      if (data.sedes && data.sedes.length === 1) {
        set({ expandedSedes: new Set([data.sedes[0].id]) });
      }
    } catch (err) {
      set({
        treeError: err instanceof Error ? err.message : "Error cargando estructura",
        treeLoading: false,
      });
    }
  },

  refreshTree: async () => {
    const { authToken, fetchTree } = get();
    if (authToken) await fetchTree(authToken);
  },

  selectSede: (id) => {
    set({ selectedSedeId: id, selectedEdificioId: null, selectedPisoId: null, activePiso: null, pisoError: null });
  },

  selectEdificio: (id) => {
    set({ selectedEdificioId: id, selectedPisoId: null, activePiso: null, pisoError: null });
  },

  selectPiso: async (id: string, token: string) => {
    set({ selectedPisoId: id, pisoLoading: true, pisoError: null, activePiso: null, selectedItem: null });
    try {
      const data = await apiClient.get<PisoDetail>(`/api/v1/infrastructure/pisos/${id}`, { token });
      set({ activePiso: data, pisoLoading: false });
    } catch (err) {
      set({
        pisoLoading: false,
        pisoError: err instanceof Error ? err.message : "Error cargando detalle del piso",
      });
    }
  },

  toggleSedeExpand: (id) => {
    set((state) => {
      const next = new Set(state.expandedSedes);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedSedes: next };
    });
  },

  toggleEdificioExpand: (id) => {
    set((state) => {
      const next = new Set(state.expandedEdificios);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedEdificios: next };
    });
  },

  setSelectedItem: (item, position) => {
    set({ selectedItem: item, selectedItemPosition: position ?? null });
  },

  clearSelectedItem: () => {
    set({ selectedItem: null, selectedItemPosition: null });
  },

  updatePlanoItem: async (itemId: string, data: Partial<PlanoItem>) => {
    const { authToken, activePiso, selectedItem } = get();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);

    let updatedItemData = { ...data };

    if (isUUID && authToken) {
      try {
        const res = await apiClient.patch<PlanoItem>(
          `/api/v1/infrastructure/items/${itemId}`,
          data,
          { token: authToken }
        );
        updatedItemData = res;
      } catch (e) {
        console.error("Error al actualizar item en backend:", e);
      }
    }

    if (activePiso) {
      const updatedItems = activePiso.items.map((i) =>
        i.id === itemId ? { ...i, ...updatedItemData } : i
      );
      set({ activePiso: { ...activePiso, items: updatedItems } });
    }

    if (selectedItem && selectedItem.id === itemId) {
      set({ selectedItem: { ...selectedItem, ...updatedItemData } });
    }
  },
}));
