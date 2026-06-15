"""Endpoints CRUD de usuarios. Sirve como plantilla para nuevas entidades."""
import math
import uuid

from fastapi import APIRouter, Query, status

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.common import PaginatedResponse
from app.schemas.user import UserRead, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def get_me(current_user: CurrentUser) -> UserRead:
    """Retorna el usuario autenticado actual."""
    return UserRead.model_validate(current_user)


@router.get("", response_model=PaginatedResponse[UserRead])
async def list_users(
    db: DbSession,
    _: CurrentUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginatedResponse[UserRead]:
    """Lista usuarios de forma paginada."""
    service = UserService(db)
    skip = (page - 1) * page_size
    users, total = await service.list_users(skip=skip, limit=page_size)
    return PaginatedResponse[UserRead](
        items=[UserRead.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: uuid.UUID, db: DbSession, _: CurrentUser) -> UserRead:
    """Obtiene un usuario por id."""
    service = UserService(db)
    user = await service.get_by_id(user_id)
    return UserRead.model_validate(user)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: uuid.UUID, payload: UserUpdate, db: DbSession, _: CurrentUser
) -> UserRead:
    """Actualiza parcialmente un usuario."""
    service = UserService(db)
    user = await service.update_user(user_id, payload)
    return UserRead.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: uuid.UUID, db: DbSession, _: CurrentUser) -> None:
    """Elimina (soft delete) un usuario."""
    service = UserService(db)
    await service.delete_user(user_id)
