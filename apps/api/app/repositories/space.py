"""
Repositorio para Espacios Físicos y Asignaciones Espacio-Persona.
"""
import uuid
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.infrastructure import Espacio, EspacioPersona, Piso, Edificio, Sede
from app.repositories.base import BaseRepository


class EspacioRepository(BaseRepository[Espacio]):
    model = Espacio

    async def list_by_piso(self, piso_id: uuid.UUID) -> list[Espacio]:
        stmt = (
            select(Espacio)
            .where(Espacio.piso_id == piso_id, Espacio.deleted_at.is_(None))
            .options(
                selectinload(Espacio.unidad),
                selectinload(Espacio.asignaciones_personas).selectinload(EspacioPersona.persona),
            )
            .order_by(Espacio.codigo)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_piso_and_codigo(self, piso_id: uuid.UUID, codigo: str) -> Espacio | None:
        stmt = (
            select(Espacio)
            .where(
                Espacio.piso_id == piso_id,
                Espacio.codigo == codigo,
                Espacio.deleted_at.is_(None),
            )
            .options(
                selectinload(Espacio.unidad),
                selectinload(Espacio.asignaciones_personas).selectinload(EspacioPersona.persona),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_with_details(self, espacio_id: uuid.UUID) -> Espacio | None:
        stmt = (
            select(Espacio)
            .where(Espacio.id == espacio_id, Espacio.deleted_at.is_(None))
            .options(
                selectinload(Espacio.unidad),
                selectinload(Espacio.piso).selectinload(Piso.edificio).selectinload(Edificio.sede),
                selectinload(Espacio.asignaciones_personas).selectinload(EspacioPersona.persona),
                selectinload(Espacio.plano_items),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()


class EspacioPersonaRepository(BaseRepository[EspacioPersona]):
    model = EspacioPersona

    async def list_by_espacio(self, espacio_id: uuid.UUID) -> list[EspacioPersona]:
        stmt = (
            select(EspacioPersona)
            .where(
                EspacioPersona.espacio_id == espacio_id,
                EspacioPersona.deleted_at.is_(None),
            )
            .options(selectinload(EspacioPersona.persona))
            .order_by(EspacioPersona.rol, EspacioPersona.created_at)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_persona(self, persona_id: uuid.UUID) -> list[EspacioPersona]:
        stmt = (
            select(EspacioPersona)
            .where(
                EspacioPersona.persona_id == persona_id,
                EspacioPersona.deleted_at.is_(None),
            )
            .options(selectinload(EspacioPersona.espacio).selectinload(Espacio.piso))
            .order_by(EspacioPersona.created_at)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
