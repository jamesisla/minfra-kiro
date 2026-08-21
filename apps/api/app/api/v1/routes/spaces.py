"""
Endpoints para gestión de Espacios Físicos (Recintos) y Asignaciones Espacio-Persona.
"""
import uuid
from fastapi import APIRouter, status
from app.core.dependencies import CurrentUser, DbSession
from app.schemas.space import (
    EspacioCreate,
    EspacioPersonaCreate,
    EspacioPersonaRead,
    EspacioPersonaUpdate,
    EspacioRead,
    EspacioUpdate,
    EspacioWithDetailsRead,
)
from app.services.space_service import SpaceService

router = APIRouter(prefix="/spaces", tags=["spaces"])


# ── Espacios ──────────────────────────────────────────────────────────────

@router.get("/piso/{piso_id}", response_model=list[EspacioRead])
async def list_spaces_by_piso(
    piso_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> list[EspacioRead]:
    service = SpaceService(db)
    return await service.list_by_piso(piso_id)


@router.get("/{espacio_id}", response_model=EspacioWithDetailsRead)
async def get_space(
    espacio_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> EspacioWithDetailsRead:
    service = SpaceService(db)
    return await service.get_by_id(espacio_id)


@router.post("", response_model=EspacioRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=EspacioRead, status_code=status.HTTP_201_CREATED)
async def create_space(
    payload: EspacioCreate,
    db: DbSession,
    _: CurrentUser,
) -> EspacioRead:
    service = SpaceService(db)
    return await service.create(payload)


@router.patch("/{espacio_id}", response_model=EspacioRead)
async def update_space(
    espacio_id: uuid.UUID,
    payload: EspacioUpdate,
    db: DbSession,
    _: CurrentUser,
) -> EspacioRead:
    service = SpaceService(db)
    return await service.update(espacio_id, payload)


@router.delete("/{espacio_id}", status_code=status.HTTP_200_OK)
async def delete_space(
    espacio_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> dict[str, str]:
    service = SpaceService(db)
    await service.delete(espacio_id)
    return {"message": "Espacio eliminado exitosamente"}


# ── Asignaciones de Personas ──────────────────────────────────────────────

@router.get("/{espacio_id}/people", response_model=list[EspacioPersonaRead])
async def list_space_people(
    espacio_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> list[EspacioPersonaRead]:
    service = SpaceService(db)
    return await service.list_personas(espacio_id)


@router.post("/{espacio_id}/people", response_model=EspacioPersonaRead, status_code=status.HTTP_201_CREATED)
async def assign_person_to_space(
    espacio_id: uuid.UUID,
    payload: EspacioPersonaCreate,
    db: DbSession,
    _: CurrentUser,
) -> EspacioPersonaRead:
    service = SpaceService(db)
    return await service.assign_persona(espacio_id, payload)


@router.patch("/assignments/{assignment_id}", response_model=EspacioPersonaRead)
async def update_assignment(
    assignment_id: uuid.UUID,
    payload: EspacioPersonaUpdate,
    db: DbSession,
    _: CurrentUser,
) -> EspacioPersonaRead:
    service = SpaceService(db)
    return await service.update_persona_assignment(assignment_id, payload)


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_200_OK)
async def delete_assignment(
    assignment_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> dict[str, str]:
    service = SpaceService(db)
    await service.remove_persona_assignment(assignment_id)
    return {"message": "Asignación eliminada exitosamente"}
