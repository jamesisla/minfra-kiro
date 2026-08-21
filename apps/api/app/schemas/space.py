"""
Schemas Pydantic para Espacios Físicos y Asignaciones Espacio-Persona.
"""
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.person import PersonaRead


# ── EspacioPersona ────────────────────────────────────────────────────────

class EspacioPersonaBase(BaseModel):
    espacio_id: uuid.UUID
    persona_id: uuid.UUID
    rol: str = "OCUPANTE"  # RESPONSABLE, OCUPANTE, BRIGADISTA, CONTACTO
    puesto_identificador: str | None = None
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    notas: str | None = None


class EspacioPersonaCreate(EspacioPersonaBase):
    pass


class EspacioPersonaUpdate(BaseModel):
    rol: str | None = None
    puesto_identificador: str | None = None
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    notas: str | None = None


class EspacioPersonaRead(EspacioPersonaBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    persona: PersonaRead | None = None
    created_at: datetime
    updated_at: datetime


# ── Espacio ───────────────────────────────────────────────────────────────

class EspacioBase(BaseModel):
    piso_id: uuid.UUID
    codigo: str
    nombre: str | None = None
    tipo: str = "SALA"
    estado: str = "Disponible"
    capacidad: int = 0
    area_m2: float | None = None
    perimetro_m: float | None = None
    unidad_id: uuid.UUID | None = None
    metadata_extra: str | None = None


class EspacioCreate(EspacioBase):
    pass


class EspacioUpdate(BaseModel):
    codigo: str | None = None
    nombre: str | None = None
    tipo: str | None = None
    estado: str | None = None
    capacidad: int | None = None
    area_m2: float | None = None
    perimetro_m: float | None = None
    unidad_id: uuid.UUID | None = None
    metadata_extra: str | None = None


class EspacioRead(EspacioBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class EspacioWithDetailsRead(EspacioRead):
    unidad_nombre: str | None = None
    unidad_codigo: str | None = None
    sede_nombre: str | None = None
    edificio_nombre: str | None = None
    piso_numero: int | None = None
    personas_asignadas: list[EspacioPersonaRead] = []
