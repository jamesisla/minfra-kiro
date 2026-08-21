"""
Schemas Pydantic para infraestructura universitaria.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ── PlanoItem ──────────────────────────────────────────────────────────────

class PlanoItemBase(BaseModel):
    tipo: str
    nombre: str | None = None
    capa: str | None = None
    x: float | None = None
    y: float | None = None
    ancho: float | None = None
    alto: float | None = None
    metadata_extra: str | None = None
    espacio_id: uuid.UUID | None = None


class PlanoItemUpdate(BaseModel):
    tipo: str | None = None
    nombre: str | None = None
    capa: str | None = None
    metadata_extra: str | None = None
    espacio_id: uuid.UUID | None = None


class PlanoItemRead(PlanoItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    piso_id: uuid.UUID
    espacio_id: uuid.UUID | None = None


# ── Piso ──────────────────────────────────────────────────────────────────

class PisoBase(BaseModel):
    numero: int
    nombre: str | None = None


class PisoCreate(PisoBase):
    edificio_id: uuid.UUID


class PisoUpdate(BaseModel):
    numero: int | None = None
    nombre: str | None = None


class PisoRead(PisoBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    edificio_id: uuid.UUID
    archivo_dxf: str | None = None
    min_x: float | None = None
    min_y: float | None = None
    max_x: float | None = None
    max_y: float | None = None
    created_at: datetime
    updated_at: datetime


class PisoReadWithSVG(PisoRead):
    svg_data: str | None = None
    items: list[PlanoItemRead] = []


# ── Edificio ──────────────────────────────────────────────────────────────

class EdificioBase(BaseModel):
    nombre: str
    codigo: str | None = None
    descripcion: str | None = None


class EdificioCreate(EdificioBase):
    sede_id: uuid.UUID


class EdificioUpdate(BaseModel):
    nombre: str | None = None
    codigo: str | None = None
    descripcion: str | None = None


class EdificioRead(EdificioBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    sede_id: uuid.UUID
    pisos: list[PisoRead] = []
    created_at: datetime
    updated_at: datetime


# ── Sede ──────────────────────────────────────────────────────────────────

class SedeBase(BaseModel):
    nombre: str
    descripcion: str | None = None
    direccion: str | None = None


class SedeCreate(SedeBase):
    pass


class SedeUpdate(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    direccion: str | None = None



class SedeRead(SedeBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class SedeReadWithEdificios(SedeRead):
    edificios: list[EdificioRead] = []


# ── Árbol de navegación (respuesta ligera) ────────────────────────────────

class PisoTreeItem(BaseModel):
    id: uuid.UUID
    numero: int
    nombre: str | None
    tiene_plano: bool


class EdificioTreeItem(BaseModel):
    id: uuid.UUID
    nombre: str
    codigo: str | None
    pisos: list[PisoTreeItem]


class SedeTreeItem(BaseModel):
    id: uuid.UUID
    nombre: str
    edificios: list[EdificioTreeItem]


class InfrastructureTree(BaseModel):
    sedes: list[SedeTreeItem]


# ── Upload DXF ────────────────────────────────────────────────────────────

class DxfUploadResult(BaseModel):
    piso_id: uuid.UUID
    archivo: str
    entidades_procesadas: int
    mensaje: str


# ── Reportes & Métricas ───────────────────────────────────────────────────

class CategoryReport(BaseModel):
    tipo: str
    label: str
    cantidad: int
    area_total_m2: float
    porcentaje_area: float


class ItemReportDetail(BaseModel):
    id: uuid.UUID
    nombre: str | None
    tipo: str
    capa: str | None
    area_m2: float | None
    perimetro_m: float | None
    sede_nombre: str
    edificio_nombre: str
    piso_nombre: str


class ReportSummary(BaseModel):
    scope: str
    scope_id: str | None = None
    scope_name: str
    total_area_m2: float
    total_recintos: int
    total_sedes: int
    total_edificios: int
    total_pisos: int
    categorias: list[CategoryReport]
    items_detalle: list[ItemReportDetail]

