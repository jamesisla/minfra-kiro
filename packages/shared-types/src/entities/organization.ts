export interface UnidadOrganizacional {
  id: string;
  nombre: string;
  codigo?: string | null;
  tipo: string;
  descripcion?: string | null;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnidadOrganizacionalTreeItem {
  id: string;
  nombre: string;
  codigo?: string | null;
  tipo: string;
  subunidades: UnidadOrganizacionalTreeItem[];
}
