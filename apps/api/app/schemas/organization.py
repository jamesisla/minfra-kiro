"""
Schemas Pydantic para Unidades Organizacionales.
"""
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class UnidadOrganizacionalBase(BaseModel):
    nombre: str
    codigo: str | None = None
    tipo: str = "DEPARTAMENTO"
    descripcion: str | None = None
    parent_id: uuid.UUID | None = None


class UnidadOrganizacionalCreate(UnidadOrganizacionalBase):
    pass


class UnidadOrganizacionalUpdate(BaseModel):
    nombre: str | None = None
    codigo: str | None = None
    tipo: str | None = None
    descripcion: str | None = None
    parent_id: uuid.UUID | None = None


class UnidadOrganizacionalRead(UnidadOrganizacionalBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class UnidadOrganizacionalTreeItem(BaseModel):
    id: uuid.UUID
    nombre: str
    codigo: str | None = None
    tipo: str
    subunidades: list["UnidadOrganizacionalTreeItem"] = []
