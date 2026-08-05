"""
Endpoints de infraestructura universitaria.
Sedes → Edificios → Pisos → Planos DXF.
"""
import uuid

from fastapi import APIRouter, File, UploadFile, status

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.infrastructure import (
    DxfUploadResult,
    EdificioCreate,
    EdificioRead,
    InfrastructureTree,
    PisoCreate,
    PisoRead,
    PisoReadWithSVG,
    PlanoItemRead,
    PlanoItemUpdate,
    SedeCreate,
    SedeRead,
)
from app.services.infrastructure_service import InfrastructureService

router = APIRouter(prefix="/infrastructure", tags=["infrastructure"])


# ── Árbol de navegación ───────────────────────────────────────────────────

@router.get("/tree", response_model=InfrastructureTree)
async def get_tree(db: DbSession, _: CurrentUser) -> InfrastructureTree:
    """Retorna el árbol completo sede → edificio → piso para la navegación lateral."""
    service = InfrastructureService(db)
    return await service.get_tree()


# ── Sedes ─────────────────────────────────────────────────────────────────

@router.get("/sedes", response_model=list[SedeRead])
async def list_sedes(db: DbSession, _: CurrentUser) -> list[SedeRead]:
    service = InfrastructureService(db)
    return await service.list_sedes()


@router.post("/sedes", response_model=SedeRead, status_code=status.HTTP_201_CREATED)
async def create_sede(payload: SedeCreate, db: DbSession, _: CurrentUser) -> SedeRead:
    service = InfrastructureService(db)
    return await service.create_sede(payload)


@router.get("/sedes/{sede_id}", response_model=SedeRead)
async def get_sede(sede_id: uuid.UUID, db: DbSession, _: CurrentUser) -> SedeRead:
    service = InfrastructureService(db)
    return await service.get_sede(sede_id)


# ── Edificios ─────────────────────────────────────────────────────────────

@router.get("/sedes/{sede_id}/edificios", response_model=list[EdificioRead])
async def list_edificios(sede_id: uuid.UUID, db: DbSession, _: CurrentUser) -> list[EdificioRead]:
    service = InfrastructureService(db)
    return await service.list_edificios(sede_id)


@router.post("/edificios", response_model=EdificioRead, status_code=status.HTTP_201_CREATED)
async def create_edificio(payload: EdificioCreate, db: DbSession, _: CurrentUser) -> EdificioRead:
    service = InfrastructureService(db)
    return await service.create_edificio(payload)


# ── Pisos ─────────────────────────────────────────────────────────────────

@router.get("/edificios/{edificio_id}/pisos", response_model=list[PisoRead])
async def list_pisos(
    edificio_id: uuid.UUID, db: DbSession, _: CurrentUser
) -> list[PisoRead]:
    service = InfrastructureService(db)
    return await service.list_pisos(edificio_id)


@router.post("/pisos", response_model=PisoRead, status_code=status.HTTP_201_CREATED)
async def create_piso(payload: PisoCreate, db: DbSession, _: CurrentUser) -> PisoRead:
    service = InfrastructureService(db)
    return await service.create_piso(payload)


@router.get("/pisos/{piso_id}", response_model=PisoReadWithSVG)
async def get_piso(piso_id: uuid.UUID, db: DbSession, _: CurrentUser) -> PisoReadWithSVG:
    """Retorna el piso con su SVG y todos sus items. Usar para el visor."""
    service = InfrastructureService(db)
    return await service.get_piso_with_svg(piso_id)


# ── Upload DXF ────────────────────────────────────────────────────────────

@router.post(
    "/pisos/{piso_id}/upload-dxf",
    response_model=DxfUploadResult,
    status_code=status.HTTP_200_OK,
)
async def upload_dxf(
    piso_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
    file: UploadFile = File(...),
) -> DxfUploadResult:
    """
    Sube un archivo DXF y lo asocia al piso indicado.
    Procesa el plano, genera el SVG y extrae las entidades.
    """
    content = await file.read()
    service = InfrastructureService(db)
    return await service.upload_dxf(piso_id, file.filename or "plano.dxf", content)


# ── Items de Plano ────────────────────────────────────────────────────────

@router.patch("/items/{item_id}", response_model=PlanoItemRead)
async def update_item(
    item_id: uuid.UUID,
    payload: PlanoItemUpdate,
    db: DbSession,
    _: CurrentUser,
) -> PlanoItemRead:
    """Actualiza la información de un item del plano (nombre, tipo, capa, metadata_extra)."""
    service = InfrastructureService(db)
    return await service.update_item(item_id, payload)

