"""
Repositorio genérico base con operaciones CRUD comunes.

Cada repositorio específico hereda de BaseRepository y puede
agregar métodos de consulta adicionales propios del dominio.
"""
import uuid
from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Repositorio genérico parametrizado por el modelo ORM."""

    model: type[ModelType]

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, id: uuid.UUID | int) -> ModelType | None:
        """Obtiene un registro por su id (excluye soft-deleted)."""
        stmt = select(self.model).where(
            self.model.id == id, self.model.deleted_at.is_(None)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list(self, skip: int = 0, limit: int = 50) -> list[ModelType]:
        """Lista registros con paginación simple (excluye soft-deleted)."""
        stmt = (
            select(self.model)
            .where(self.model.deleted_at.is_(None))
            .offset(skip)
            .limit(limit)
            .order_by(self.model.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count(self) -> int:
        """Cuenta el total de registros activos (excluye soft-deleted)."""
        stmt = select(func.count()).select_from(self.model).where(
            self.model.deleted_at.is_(None)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def create(self, obj: ModelType) -> ModelType:
        """Persiste un nuevo registro."""
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: ModelType, data: dict) -> ModelType:
        """Actualiza los campos provistos en `data` sobre `obj`."""
        for field, value in data.items():
            setattr(obj, field, value)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelType) -> None:
        """Elimina físicamente el registro de la base de datos."""
        await self.db.delete(obj)
        await self.db.commit()

    async def soft_delete(self, obj: ModelType) -> None:
        """Marca el registro como eliminado (soft delete)."""
        from datetime import datetime, timezone

        obj.deleted_at = datetime.now(timezone.utc)
        await self.db.commit()

