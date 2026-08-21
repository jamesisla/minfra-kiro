"""
Esquemas Pydantic v2 para Documentos y Cumplimiento Normativo / Compliance (Fase 3).
"""
import uuid
from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


DocumentType = Literal[
    "CERTIFICADO_SEC",
    "PERMISO_EDIFICACION",
    "TITULO_DOMINIO",
    "POLIZA_SEGURO",
    "PROTOCOLO_BIOSEGURIDAD",
    "MANUAL_GARANTIA",
    "PLANO_TECNICO",
    "INFORME_TECNICO",
    "OTRO",
]

ExpirationStatus = Literal[
    "VIGENTE",
    "POR_VENCER_60",
    "POR_VENCER_30",
    "VENCIDO",
    "SIN_VENCIMIENTO",
]


class DocumentoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=255)
    tipo_documento: str = Field(default="OTRO", max_length=100)
    descripcion: str | None = None
    fecha_emision: date | None = None
    fecha_vencimiento: date | None = None
    emisor_entidad: str | None = Field(default=None, max_length=255)
    numero_folio: str | None = Field(default=None, max_length=100)

    # Entidades asociadas (polimórfico)
    sede_id: uuid.UUID | None = None
    edificio_id: uuid.UUID | None = None
    piso_id: uuid.UUID | None = None
    espacio_id: uuid.UUID | None = None
    bien_id: uuid.UUID | None = None
    metadata_extra: str | None = None


class DocumentoCreate(DocumentoBase):
    pass


class DocumentoUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=255)
    tipo_documento: str | None = Field(default=None, max_length=100)
    descripcion: str | None = None
    fecha_emision: date | None = None
    fecha_vencimiento: date | None = None
    emisor_entidad: str | None = None
    numero_folio: str | None = None
    sede_id: uuid.UUID | None = None
    edificio_id: uuid.UUID | None = None
    piso_id: uuid.UUID | None = None
    espacio_id: uuid.UUID | None = None
    bien_id: uuid.UUID | None = None
    metadata_extra: str | None = None


class DocumentoRead(DocumentoBase):
    id: uuid.UUID
    archivo_path: str | None = None
    archivo_nombre: str | None = None
    archivo_peso_bytes: int | None = None
    archivo_mime_type: str | None = None

    # Campos calculados de compliance / semáforo
    estado_vencimiento: ExpirationStatus = "SIN_VENCIMIENTO"
    dias_para_vencer: int | None = None
    entidad_asociada_tipo: str | None = None
    entidad_asociada_nombre: str | None = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ComplianceAlertSummary(BaseModel):
    total_documentos: int = 0
    vigentes: int = 0
    por_vencer_60: int = 0
    por_vencer_30: int = 0
    vencidos: int = 0
    sin_vencimiento: int = 0
    por_tipo: dict[str, int] = Field(default_factory=dict)
    documentos_criticos: list[DocumentoRead] = Field(default_factory=list)
