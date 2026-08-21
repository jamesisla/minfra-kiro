"""
Servicio para gestión de Unidades Organizacionales (Facultades, Departamentos, Direcciones).
"""
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.organization import UnidadOrganizacional
from app.repositories.organization import UnidadOrganizacionalRepository
from app.schemas.organization import (
    UnidadOrganizacionalCreate,
    UnidadOrganizacionalRead,
    UnidadOrganizacionalTreeItem,
    UnidadOrganizacionalUpdate,
)


class OrganizationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = UnidadOrganizacionalRepository(db)

    async def list_all(self, skip: int = 0, limit: int = 100) -> list[UnidadOrganizacionalRead]:
        units = await self.repo.list(skip=skip, limit=limit)
        return [UnidadOrganizacionalRead.model_validate(u) for u in units]

    async def get_tree(self) -> list[UnidadOrganizacionalTreeItem]:
        roots = await self.repo.list_tree()

        def build_node(u: UnidadOrganizacional) -> UnidadOrganizacionalTreeItem:
            return UnidadOrganizacionalTreeItem(
                id=u.id,
                nombre=u.nombre,
                codigo=u.codigo,
                tipo=u.tipo,
                subunidades=[
                    build_node(child)
                    for child in u.subunidades
                    if child.deleted_at is None
                ],
            )

        return [build_node(r) for r in roots]

    async def get_by_id(self, unit_id: uuid.UUID) -> UnidadOrganizacionalRead:
        unit = await self.repo.get(unit_id)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unidad organizacional no encontrada",
            )
        return UnidadOrganizacionalRead.model_validate(unit)

    async def create(self, data: UnidadOrganizacionalCreate) -> UnidadOrganizacionalRead:
        unit = UnidadOrganizacional(
            nombre=data.nombre,
            codigo=data.codigo,
            tipo=data.tipo,
            descripcion=data.descripcion,
            parent_id=data.parent_id,
        )
        unit = await self.repo.create(unit)
        return UnidadOrganizacionalRead.model_validate(unit)

    async def update(
        self, unit_id: uuid.UUID, data: UnidadOrganizacionalUpdate
    ) -> UnidadOrganizacionalRead:
        unit = await self.repo.get(unit_id)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unidad organizacional no encontrada",
            )
        update_dict = data.model_dump(exclude_unset=True)
        unit = await self.repo.update(unit, update_dict)
        return UnidadOrganizacionalRead.model_validate(unit)

    async def delete(self, unit_id: uuid.UUID) -> None:
        unit = await self.repo.get(unit_id)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unidad organizacional no encontrada",
            )
        await self.repo.soft_delete(unit)
