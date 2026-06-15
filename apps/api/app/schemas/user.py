"""
Schemas Pydantic para la entidad User.

Convención:
  - XBase     -> campos compartidos
  - XCreate   -> payload de creación (incluye password en claro)
  - XUpdate   -> payload de actualización (todos los campos opcionales)
  - XRead     -> respuesta pública (nunca incluye hashed_password)
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    is_active: bool | None = None


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime


class UserInDB(UserRead):
    hashed_password: str
