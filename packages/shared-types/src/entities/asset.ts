export type AssetCategory =
  | "MOBILIARIO"
  | "TI_COMPUTO"
  | "CLIMATIZACION"
  | "LABORATORIO"
  | "AUDIOVISUAL"
  | "SEGURIDAD"
  | "OTRO";

export type AssetOperationalStatus =
  | "OPERATIVO"
  | "EN_MANTENCION"
  | "EN_REPARACION"
  | "DE_BAJA"
  | "EN_BODEGA";

export interface BienMovimiento {
  id: string;
  bien_id: string;
  espacio_origen_id?: string | null;
  espacio_destino_id?: string | null;
  persona_responsable_id?: string | null;
  fecha_traslado: string;
  motivo?: string | null;
  espacio_origen_codigo?: string | null;
  espacio_destino_codigo?: string | null;
  persona_responsable_nombre?: string | null;
  created_at: string;
}

export interface Bien {
  id: string;
  codigo_patrimonial: string;
  nombre: string;
  categoria: AssetCategory | string;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  estado_operativo: AssetOperationalStatus | string;
  valor_compra?: number | null;
  fecha_adquisicion?: string | null;
  fecha_garantia?: string | null;
  espacio_id?: string | null;
  custodio_id?: string | null;
  pos_x?: number | null;
  pos_y?: number | null;
  metadata_extra?: string | null;
  espacio_codigo?: string | null;
  espacio_nombre?: string | null;
  piso_id?: string | null;
  piso_numero?: number | null;
  edificio_nombre?: string | null;
  sede_nombre?: string | null;
  custodio_nombre?: string | null;
  custodio_cargo?: string | null;
  movimientos?: BienMovimiento[];
  created_at: string;
  updated_at: string;
}

export interface AssetSummaryStats {
  total_bienes: number;
  bienes_operativos: number;
  bienes_en_mantencion: number;
  bienes_de_baja: number;
  por_categoria: Record<string, number>;
}
