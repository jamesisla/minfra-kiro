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
    EdificioUpdate,
    InfrastructureTree,
    PisoCreate,
    PisoRead,
    PisoReadWithSVG,
    PisoUpdate,
    PlanoItemRead,
    PlanoItemUpdate,
    ReportSummary,
    SedeCreate,
    SedeRead,
    SedeUpdate,
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


@router.patch("/sedes/{sede_id}", response_model=SedeRead)
async def update_sede(
    sede_id: uuid.UUID, payload: SedeUpdate, db: DbSession, _: CurrentUser
) -> SedeRead:
    service = InfrastructureService(db)
    return await service.update_sede(sede_id, payload)


@router.delete("/sedes/{sede_id}", status_code=status.HTTP_200_OK)
async def delete_sede(sede_id: str, db: DbSession, _: CurrentUser) -> dict[str, str]:
    service = InfrastructureService(db)
    try:
        val_id = uuid.UUID(sede_id.strip("/"))
        await service.delete_sede(val_id)
    except ValueError:
        pass
    return {"message": "Sede eliminada exitosamente"}


@router.delete("/sedes/{sede_id}/", status_code=status.HTTP_200_OK)
async def delete_sede_slash(sede_id: str, db: DbSession, user: CurrentUser) -> dict[str, str]:
    return await delete_sede(sede_id, db, user)


@router.post("/sedes/{sede_id}/delete", status_code=status.HTTP_200_OK)
async def delete_sede_post(sede_id: str, db: DbSession, user: CurrentUser) -> dict[str, str]:
    return await delete_sede(sede_id, db, user)


@router.post("/sedes/{sede_id}/delete/", status_code=status.HTTP_200_OK)
async def delete_sede_post_slash(sede_id: str, db: DbSession, user: CurrentUser) -> dict[str, str]:
    return await delete_sede(sede_id, db, user)


# ── Edificios ─────────────────────────────────────────────────────────────

@router.get("/sedes/{sede_id}/edificios", response_model=list[EdificioRead])
async def list_edificios(sede_id: uuid.UUID, db: DbSession, _: CurrentUser) -> list[EdificioRead]:
    service = InfrastructureService(db)
    return await service.list_edificios(sede_id)


@router.post("/edificios", response_model=EdificioRead, status_code=status.HTTP_201_CREATED)
async def create_edificio(payload: EdificioCreate, db: DbSession, _: CurrentUser) -> EdificioRead:
    service = InfrastructureService(db)
    return await service.create_edificio(payload)


@router.patch("/edificios/{edificio_id}", response_model=EdificioRead)
async def update_edificio(
    edificio_id: uuid.UUID, payload: EdificioUpdate, db: DbSession, _: CurrentUser
) -> EdificioRead:
    service = InfrastructureService(db)
    return await service.update_edificio(edificio_id, payload)


@router.delete("/edificios/{edificio_id}", status_code=status.HTTP_200_OK)
async def delete_edificio(edificio_id: str, db: DbSession, _: CurrentUser) -> dict[str, str]:
    service = InfrastructureService(db)
    try:
        val_id = uuid.UUID(edificio_id.strip("/"))
        await service.delete_edificio(val_id)
    except ValueError:
        pass
    return {"message": "Edificio eliminado exitosamente"}


@router.delete("/edificios/{edificio_id}/", status_code=status.HTTP_200_OK)
async def delete_edificio_slash(edificio_id: str, db: DbSession, user: CurrentUser) -> dict[str, str]:
    return await delete_edificio(edificio_id, db, user)


@router.post("/edificios/{edificio_id}/delete", status_code=status.HTTP_200_OK)
async def delete_edificio_post(edificio_id: str, db: DbSession, user: CurrentUser) -> dict[str, str]:
    return await delete_edificio(edificio_id, db, user)


@router.post("/edificios/{edificio_id}/delete/", status_code=status.HTTP_200_OK)
async def delete_edificio_post_slash(edificio_id: str, db: DbSession, user: CurrentUser) -> dict[str, str]:
    return await delete_edificio(edificio_id, db, user)


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


@router.patch("/pisos/{piso_id}", response_model=PisoRead)
async def update_piso(
    piso_id: uuid.UUID, payload: PisoUpdate, db: DbSession, _: CurrentUser
) -> PisoRead:
    service = InfrastructureService(db)
    return await service.update_piso(piso_id, payload)


@router.delete("/pisos/{piso_id}", status_code=status.HTTP_200_OK)
async def delete_piso(piso_id: str, db: DbSession, _: CurrentUser) -> dict[str, str]:
    service = InfrastructureService(db)
    try:
        val_id = uuid.UUID(piso_id.strip("/"))
        await service.delete_piso(val_id)
    except ValueError:
        pass
    return {"message": "Piso eliminado exitosamente"}


@router.delete("/pisos/{piso_id}/", status_code=status.HTTP_200_OK)
async def delete_piso_slash(piso_id: str, db: DbSession, user: CurrentUser) -> dict[str, str]:
    return await delete_piso(piso_id, db, user)


@router.post("/pisos/{piso_id}/delete", status_code=status.HTTP_200_OK)
async def delete_piso_post(piso_id: str, db: DbSession, user: CurrentUser) -> dict[str, str]:
    return await delete_piso(piso_id, db, user)


@router.post("/pisos/{piso_id}/delete/", status_code=status.HTTP_200_OK)
async def delete_piso_post_slash(piso_id: str, db: DbSession, user: CurrentUser) -> dict[str, str]:
    return await delete_piso(piso_id, db, user)



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


# ── Reportes & Métricas ───────────────────────────────────────────────────

@router.get("/reports", response_model=ReportSummary)
@router.get("/reports/", response_model=ReportSummary)
async def get_reports(
    db: DbSession,
    _: CurrentUser,
    scope: str = "total",
    scope_id: str | None = None,
) -> ReportSummary:
    """
    Retorna métricas y reporte consolidado o filtrado por Sede, Edificio o Piso.
    """
    service = InfrastructureService(db)
    return await service.get_reports(scope=scope, scope_id=scope_id)


