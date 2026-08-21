export type DocumentType =
  | "CERTIFICADO_SEC"
  | "PERMISO_EDIFICACION"
  | "TITULO_DOMINIO"
  | "POLIZA_SEGURO"
  | "PROTOCOLO_BIOSEGURIDAD"
  | "MANUAL_GARANTIA"
  | "PLANO_TECNICO"
  | "INFORME_TECNICO"
  | "OTRO";

export type ExpirationStatus =
  | "VIGENTE"
  | "POR_VENCER_60"
  | "POR_VENCER_30"
  | "VENCIDO"
  | "SIN_VENCIMIENTO";

export interface Documento {
  id: string;
  nombre: string;
  tipo_documento: DocumentType | string;
  descripcion?: string | null;
  archivo_path?: string | null;
  archivo_nombre?: string | null;
  archivo_peso_bytes?: number | null;
  archivo_mime_type?: string | null;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  emisor_entidad?: string | null;
  numero_folio?: string | null;
  sede_id?: string | null;
  edificio_id?: string | null;
  piso_id?: string | null;
  espacio_id?: string | null;
  bien_id?: string | null;
  metadata_extra?: string | null;
  estado_vencimiento: ExpirationStatus;
  dias_para_vencer?: number | null;
  entidad_asociada_tipo?: string | null;
  entidad_asociada_nombre?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAlertSummary {
  total_documentos: number;
  vigentes: number;
  por_vencer_60: number;
  por_vencer_30: number;
  vencidos: number;
  sin_vencimiento: number;
  por_tipo: Record<string, number>;
  documentos_criticos: Documento[];
}
