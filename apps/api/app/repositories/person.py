"""
Repositorio para Personas.
"""
import uuid
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload
from app.models.person import Persona
from app.repositories.base import BaseRepository


class PersonaRepository(BaseRepository[Persona]):
    model = Persona

    async def list_with_unidad(
        self, skip: int = 0, limit: int = 50, unidad_id: uuid.UUID | None = None
    ) -> list[Persona]:
        stmt = (
            select(Persona)
            .where(Persona.deleted_at.is_(None))
            .options(selectinload(Persona.unidad))
        )
        if unidad_id:
            stmt = stmt.where(Persona.unidad_id == unidad_id)
        stmt = stmt.offset(skip).limit(limit).order_by(Persona.nombre_completo)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def search(self, query: str, limit: int = 20) -> list[Persona]:
        """Búsqueda difusa por nombre, RUT/DNI o email."""
        pattern = f"%{query.strip()}%"
        stmt = (
            select(Persona)
            .where(
                Persona.deleted_at.is_(None),
                or_(
                    Persona.nombre_completo.ilike(pattern),
                    Persona.rut_dni.ilike(pattern),
                    Persona.email.ilike(pattern),
                    Persona.cargo.ilike(pattern),
                ),
            )
            .options(selectinload(Persona.unidad))
            .limit(limit)
            .order_by(Persona.nombre_completo)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_with_asignaciones(self, persona_id: uuid.UUID) -> Persona | None:
        stmt = (
            select(Persona)
            .where(Persona.id == persona_id, Persona.deleted_at.is_(None))
            .options(
                selectinload(Persona.unidad),
                selectinload(Persona.asignaciones_espacio),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
