"""
Endpoints para gestión de Bienes / Activos Fijos e Inventario Físico (Fase 2).
"""
import uuid
from fastapi import APIRouter, Query, status
from app.core.dependencies import CurrentUser, DbSession
from app.schemas.asset import (
    AssetSummaryStats,
    BienCreate,
    BienPositionUpdate,
    BienTransferRequest,
    BienUpdate,
    BienWithDetailsRead,
)
from app.services.asset_service import AssetService

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=list[BienWithDetailsRead])
@router.get("/", response_model=list[BienWithDetailsRead])
async def list_assets(
    db: DbSession,
    _: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    categoria: str | None = None,
    estado: str | None = None,
    espacio_id: uuid.UUID | None = None,
    custodio_id: uuid.UUID | None = None,
) -> list[BienWithDetailsRead]:
    service = AssetService(db)
    return await service.list_all(
        skip=skip,
        limit=limit,
        categoria=categoria,
        estado=estado,
        espacio_id=espacio_id,
        custodio_id=custodio_id,
    )


@router.get("/stats", response_model=AssetSummaryStats)
async def get_asset_stats(
    db: DbSession,
    _: CurrentUser,
) -> AssetSummaryStats:
    service = AssetService(db)
    return await service.get_stats()


@router.get("/piso/{piso_id}", response_model=list[BienWithDetailsRead])
async def list_assets_by_piso(
    piso_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> list[BienWithDetailsRead]:
    """Retorna todos los bienes de un piso con coordenadas para renderizado de pines en CAD/SVG."""
    service = AssetService(db)
    return await service.list_by_piso(piso_id)


@router.get("/espacio/{espacio_id}", response_model=list[BienWithDetailsRead])
async def list_assets_by_espacio(
    espacio_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> list[BienWithDetailsRead]:
    """Retorna todos los bienes inventariados en un recinto específico."""
    service = AssetService(db)
    return await service.list_by_espacio(espacio_id)


@router.get("/search", response_model=list[BienWithDetailsRead])
async def search_assets(
    db: DbSession,
    _: CurrentUser,
    q: str = Query(..., min_length=1, description="Código patrimonial, nombre, marca o serie"),
    limit: int = 30,
) -> list[BienWithDetailsRead]:
    service = AssetService(db)
    return await service.search(query=q, limit=limit)


@router.get("/{bien_id}", response_model=BienWithDetailsRead)
async def get_asset(
    bien_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> BienWithDetailsRead:
    service = AssetService(db)
    return await service.get_by_id(bien_id)


@router.post("", response_model=BienWithDetailsRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=BienWithDetailsRead, status_code=status.HTTP_201_CREATED)
async def create_asset(
    payload: BienCreate,
    db: DbSession,
    _: CurrentUser,
) -> BienWithDetailsRead:
    service = AssetService(db)
    return await service.create(payload)


@router.patch("/{bien_id}", response_model=BienWithDetailsRead)
async def update_asset(
    bien_id: uuid.UUID,
    payload: BienUpdate,
    db: DbSession,
    _: CurrentUser,
) -> BienWithDetailsRead:
    service = AssetService(db)
    return await service.update(bien_id, payload)


@router.patch("/{bien_id}/position", response_model=BienWithDetailsRead)
async def update_asset_position(
    bien_id: uuid.UUID,
    payload: BienPositionUpdate,
    db: DbSession,
    _: CurrentUser,
) -> BienWithDetailsRead:
    """Actualiza las coordenadas (pos_x, pos_y) del bien en el plano CAD."""
    service = AssetService(db)
    return await service.update_position(bien_id, payload)


@router.post("/{bien_id}/transfer", response_model=BienWithDetailsRead)
async def transfer_asset(
    bien_id: uuid.UUID,
    payload: BienTransferRequest,
    db: DbSession,
    _: CurrentUser,
) -> BienWithDetailsRead:
    """Traslada un bien a otro recinto y registra el movimiento de trazabilidad."""
    service = AssetService(db)
    return await service.transfer(bien_id, payload)


@router.delete("/{bien_id}", status_code=status.HTTP_200_OK)
async def delete_asset(
    bien_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> dict[str, str]:
    service = AssetService(db)
    await service.delete(bien_id)
    return {"message": "Bien eliminado exitosamente"}
