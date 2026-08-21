"""
Endpoints para gestión de Unidades Organizacionales (Facultades, Departamentos, Escuelas).
"""
import uuid
from fastapi import APIRouter, status
from app.core.dependencies import CurrentUser, DbSession
from app.schemas.organization import (
    UnidadOrganizacionalCreate,
    UnidadOrganizacionalRead,
    UnidadOrganizacionalTreeItem,
    UnidadOrganizacionalUpdate,
)
from app.services.organization_service import OrganizationService

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("", response_model=list[UnidadOrganizacionalRead])
@router.get("/", response_model=list[UnidadOrganizacionalRead])
async def list_organizations(
    db: DbSession,
    _: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> list[UnidadOrganizacionalRead]:
    service = OrganizationService(db)
    return await service.list_all(skip=skip, limit=limit)


@router.get("/tree", response_model=list[UnidadOrganizacionalTreeItem])
async def get_organizations_tree(
    db: DbSession,
    _: CurrentUser,
) -> list[UnidadOrganizacionalTreeItem]:
    service = OrganizationService(db)
    return await service.get_tree()


@router.get("/{unit_id}", response_model=UnidadOrganizacionalRead)
async def get_organization(
    unit_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> UnidadOrganizacionalRead:
    service = OrganizationService(db)
    return await service.get_by_id(unit_id)


@router.post("", response_model=UnidadOrganizacionalRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=UnidadOrganizacionalRead, status_code=status.HTTP_201_CREATED)
async def create_organization(
    payload: UnidadOrganizacionalCreate,
    db: DbSession,
    _: CurrentUser,
) -> UnidadOrganizacionalRead:
    service = OrganizationService(db)
    return await service.create(payload)


@router.patch("/{unit_id}", response_model=UnidadOrganizacionalRead)
async def update_organization(
    unit_id: uuid.UUID,
    payload: UnidadOrganizacionalUpdate,
    db: DbSession,
    _: CurrentUser,
) -> UnidadOrganizacionalRead:
    service = OrganizationService(db)
    return await service.update(unit_id, payload)


@router.delete("/{unit_id}", status_code=status.HTTP_200_OK)
async def delete_organization(
    unit_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> dict[str, str]:
    service = OrganizationService(db)
    await service.delete(unit_id)
    return {"message": "Unidad organizacional eliminada"}
