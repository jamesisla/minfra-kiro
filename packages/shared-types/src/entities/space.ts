import { Persona } from "./person";

export interface EspacioPersona {
  id: string;
  espacio_id: string;
  persona_id: string;
  rol: "RESPONSABLE" | "OCUPANTE" | "BRIGADISTA" | "CONTACTO" | string;
  puesto_identificador?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  notas?: string | null;
  persona?: Persona | null;
  created_at: string;
  updated_at: string;
}

export interface Espacio {
  id: string;
  piso_id: string;
  codigo: string;
  nombre?: string | null;
  tipo: string;
  estado: string;
  capacidad: number;
  area_m2?: number | null;
  perimetro_m?: number | null;
  unidad_id?: string | null;
  unidad_nombre?: string | null;
  unidad_codigo?: string | null;
  sede_nombre?: string | null;
  edificio_nombre?: string | null;
  piso_numero?: number | null;
  personas_asignadas?: EspacioPersona[];
  metadata_extra?: string | null;
  created_at: string;
  updated_at: string;
}
