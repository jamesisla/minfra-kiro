export interface Persona {
  id: string;
  nombre_completo: string;
  rut_dni?: string | null;
  email?: string | null;
  telefono?: string | null;
  cargo?: string | null;
  tipo: string;
  unidad_id?: string | null;
  user_id?: string | null;
  metadata_extra?: string | null;
  unidad_nombre?: string | null;
  unidad_codigo?: string | null;
  created_at: string;
  updated_at: string;
}
