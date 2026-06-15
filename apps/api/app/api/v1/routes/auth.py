"""Endpoints de autenticación."""
from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import DbSession
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserCreate, UserRead
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: DbSession) -> UserRead:
    """Registra un nuevo usuario."""
    service = UserService(db)
    user = await service.create_user(payload)
    return UserRead.model_validate(user)


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, db: DbSession) -> Token:
    """Autentica un usuario y retorna un JWT."""
    service = UserService(db)
    user = await service.authenticate(payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )
    token = create_access_token(subject=str(user.id))
    return Token(access_token=token)
