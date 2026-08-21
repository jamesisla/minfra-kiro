"""
Schemas Pydantic para Bienes / Activos Fijos e Inventario Físico (Fase 2).
"""
import uuid
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.person import PersonaRead


# ── Movimiento de Bien (Trazabilidad) ─────────────────────────────────────

class BienMovimientoBase(BaseModel):
    bien_id: uuid.UUID
    espacio_origen_id: uuid.UUID | None = None
    espacio_destino_id: uuid.UUID | None = None
    persona_responsable_id: uuid.UUID | None = None
    motivo: str | None = None


class BienMovimientoCreate(BienMovimientoBase):
    pass


class BienMovimientoRead(BienMovimientoBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    fecha_traslado: datetime
    espacio_origen_codigo: str | None = None
    espacio_destino_codigo: str | None = None
    persona_responsable_nombre: str | None = None
    created_at: datetime


# ── Bien / Activo Fijo ───────────────────────────────────────────────────

class BienBase(BaseModel):
    codigo_patrimonial: str
    nombre: str
    categoria: str = "MOBILIARIO"  # MOBILIARIO, TI_COMPUTO, CLIMATIZACION, LABORATORIO, AUDIOVISUAL, SEGURIDAD, OTRO
    marca: str | None = None
    modelo: str | None = None
    numero_serie: str | None = None
    estado_operativo: str = "OPERATIVO"  # OPERATIVO, EN_MANTENCION, EN_REPARACION, DE_BAJA, EN_BODEGA
    valor_compra: float | None = None
    fecha_adquisicion: date | None = None
    fecha_garantia: date | None = None
    espacio_id: uuid.UUID | None = None
    custodio_id: uuid.UUID | None = None
    pos_x: float | None = None
    pos_y: float | None = None
    metadata_extra: str | None = None


class BienCreate(BienBase):
    pass


class BienUpdate(BaseModel):
    codigo_patrimonial: str | None = None
    nombre: str | None = None
    categoria: str | None = None
    marca: str | None = None
    modelo: str | None = None
    numero_serie: str | None = None
    estado_operativo: str | None = None
    valor_compra: float | None = None
    fecha_adquisicion: date | None = None
    fecha_garantia: date | None = None
    espacio_id: uuid.UUID | None = None
    custodio_id: uuid.UUID | None = None
    pos_x: float | None = None
    pos_y: float | None = None
    metadata_extra: str | None = None


class BienPositionUpdate(BaseModel):
    pos_x: float
    pos_y: float


class BienTransferRequest(BaseModel):
    espacio_destino_id: uuid.UUID
    persona_responsable_id: uuid.UUID | None = None
    motivo: str | None = "Reasignación de recinto"


class BienRead(BienBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class BienWithDetailsRead(BienRead):
    espacio_codigo: str | None = None
    espacio_nombre: str | None = None
    piso_id: uuid.UUID | None = None
    piso_numero: int | None = None
    edificio_nombre: str | None = None
    sede_nombre: str | None = None
    custodio_nombre: str | None = None
    custodio_cargo: str | None = None
    movimientos: list[BienMovimientoRead] = []


class AssetSummaryStats(BaseModel):
    total_bienes: int
    bienes_operativos: int
    bienes_en_mantencion: int
    bienes_de_baja: int
    por_categoria: dict[str, int] = {}
