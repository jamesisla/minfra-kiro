"""
Schemas Pydantic para Personas y Asignaciones de Personal.
"""
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class PersonaBase(BaseModel):
    nombre_completo: str
    rut_dni: str | None = None
    email: str | None = None
    telefono: str | None = None
    cargo: str | None = None
    tipo: str = "DOCENTE"
    unidad_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    metadata_extra: str | None = None


class PersonaCreate(PersonaBase):
    pass


class PersonaUpdate(BaseModel):
    nombre_completo: str | None = None
    rut_dni: str | None = None
    email: str | None = None
    telefono: str | None = None
    cargo: str | None = None
    tipo: str | None = None
    unidad_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    metadata_extra: str | None = None


class PersonaRead(PersonaBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PersonaWithUnidadRead(PersonaRead):
    unidad_nombre: str | None = None
    unidad_codigo: str | None = None
