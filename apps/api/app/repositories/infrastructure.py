"""
Repositorios para la infraestructura universitaria.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.infrastructure import Edificio, Piso, PlanoItem, Sede
from app.repositories.base import BaseRepository


class SedeRepository(BaseRepository[Sede]):
    model = Sede

    async def list_with_edificios(self) -> list[Sede]:
        """Lista todas las sedes con sus edificios y pisos (árbol completo)."""
        stmt = (
            select(Sede)
            .where(Sede.deleted_at.is_(None))
            .options(
                selectinload(Sede.edificios).selectinload(Edificio.pisos)
            )
            .order_by(Sede.nombre)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().unique().all())

    async def get_with_edificios(self, sede_id: uuid.UUID) -> Sede | None:
        stmt = (
            select(Sede)
            .where(Sede.id == sede_id, Sede.deleted_at.is_(None))
            .options(
                selectinload(Sede.edificios).selectinload(Edificio.pisos)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()


class EdificioRepository(BaseRepository[Edificio]):
    model = Edificio

    async def list_by_sede(self, sede_id: uuid.UUID) -> list[Edificio]:
        stmt = (
            select(Edificio)
            .where(Edificio.sede_id == sede_id, Edificio.deleted_at.is_(None))
            .options(selectinload(Edificio.pisos))
            .order_by(Edificio.nombre)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_with_pisos(self, edificio_id: uuid.UUID) -> Edificio | None:
        stmt = (
            select(Edificio)
            .where(Edificio.id == edificio_id, Edificio.deleted_at.is_(None))
            .options(selectinload(Edificio.pisos))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()


class PisoRepository(BaseRepository[Piso]):
    model = Piso

    async def list_by_edificio(self, edificio_id: uuid.UUID) -> list[Piso]:
        stmt = (
            select(Piso)
            .where(Piso.edificio_id == edificio_id, Piso.deleted_at.is_(None))
            .order_by(Piso.numero)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_with_items(self, piso_id: uuid.UUID) -> Piso | None:
        stmt = (
            select(Piso)
            .where(Piso.id == piso_id, Piso.deleted_at.is_(None))
            .options(selectinload(Piso.items))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()


class PlanoItemRepository(BaseRepository[PlanoItem]):
    model = PlanoItem

    async def list_by_piso(self, piso_id: uuid.UUID) -> list[PlanoItem]:
        stmt = (
            select(PlanoItem)
            .where(PlanoItem.piso_id == piso_id, PlanoItem.deleted_at.is_(None))
            .order_by(PlanoItem.tipo)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def delete_by_piso(self, piso_id: uuid.UUID) -> None:
        """Elimina (hard delete) todos los items de un piso antes de reimportar."""
        from sqlalchemy import delete as sql_delete
        stmt = sql_delete(PlanoItem).where(PlanoItem.piso_id == piso_id)
        await self.db.execute(stmt)
        await self.db.commit()
