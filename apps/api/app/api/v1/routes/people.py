"""
Endpoints para gestión de Personas (Docentes, Administrativos, Estudiantes, Personal Externo).
"""
import uuid
from fastapi import APIRouter, Query, status
from app.core.dependencies import CurrentUser, DbSession
from app.schemas.person import (
    PersonaCreate,
    PersonaRead,
    PersonaUpdate,
    PersonaWithUnidadRead,
)
from app.services.person_service import PersonService

router = APIRouter(prefix="/people", tags=["people"])


@router.get("", response_model=list[PersonaWithUnidadRead])
@router.get("/", response_model=list[PersonaWithUnidadRead])
async def list_people(
    db: DbSession,
    _: CurrentUser,
    skip: int = 0,
    limit: int = 50,
    unidad_id: uuid.UUID | None = None,
) -> list[PersonaWithUnidadRead]:
    service = PersonService(db)
    return await service.list(skip=skip, limit=limit, unidad_id=unidad_id)


@router.get("/search", response_model=list[PersonaWithUnidadRead])
async def search_people(
    db: DbSession,
    _: CurrentUser,
    q: str = Query(..., min_length=1, description="Texto de búsqueda (nombre, RUT, email o cargo)"),
    limit: int = 20,
) -> list[PersonaWithUnidadRead]:
    service = PersonService(db)
    return await service.search(query=q, limit=limit)


@router.get("/{persona_id}", response_model=PersonaWithUnidadRead)
async def get_persona(
    persona_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> PersonaWithUnidadRead:
    service = PersonService(db)
    return await service.get_by_id(persona_id)


@router.post("", response_model=PersonaWithUnidadRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PersonaWithUnidadRead, status_code=status.HTTP_201_CREATED)
async def create_persona(
    payload: PersonaCreate,
    db: DbSession,
    _: CurrentUser,
) -> PersonaWithUnidadRead:
    service = PersonService(db)
    return await service.create(payload)


@router.patch("/{persona_id}", response_model=PersonaWithUnidadRead)
async def update_persona(
    persona_id: uuid.UUID,
    payload: PersonaUpdate,
    db: DbSession,
    _: CurrentUser,
) -> PersonaWithUnidadRead:
    service = PersonService(db)
    return await service.update(persona_id, payload)


@router.delete("/{persona_id}", status_code=status.HTTP_200_OK)
async def delete_persona(
    persona_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> dict[str, str]:
    service = PersonService(db)
    await service.delete(persona_id)
    return {"message": "Persona eliminada exitosamente"}
