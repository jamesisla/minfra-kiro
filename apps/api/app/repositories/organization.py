"""
Repositorio para Unidades Organizacionales.
"""
import uuid
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.organization import UnidadOrganizacional
from app.repositories.base import BaseRepository


class UnidadOrganizacionalRepository(BaseRepository[UnidadOrganizacional]):
    model = UnidadOrganizacional

    async def list_tree(self) -> list[UnidadOrganizacional]:
        """Lista las unidades raíz con sus subunidades cargadas recursivamente."""
        stmt = (
            select(UnidadOrganizacional)
            .where(
                UnidadOrganizacional.parent_id.is_(None),
                UnidadOrganizacional.deleted_at.is_(None),
            )
            .options(selectinload(UnidadOrganizacional.subunidades))
            .order_by(UnidadOrganizacional.nombre)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().unique().all())

    async def get_by_codigo(self, codigo: str) -> UnidadOrganizacional | None:
        stmt = select(UnidadOrganizacional).where(
            UnidadOrganizacional.codigo == codigo,
            UnidadOrganizacional.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
