"""
Servicio de Usuarios: contiene la lógica de negocio.

Los routers NUNCA deben hablar directamente con repositorios o
modelos; siempre a través de un servicio. Esto facilita testing
(se puede mockear el servicio completo) y mantiene la lógica
de negocio centralizada y reutilizable.
"""
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = UserRepository(db)

    async def get_by_id(self, user_id: uuid.UUID) -> User:
        user = await self.repo.get(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
            )
        return user

    async def list_users(self, skip: int = 0, limit: int = 50) -> tuple[list[User], int]:
        users = await self.repo.list(skip=skip, limit=limit)
        total = await self.repo.count()
        return users, total

    async def create_user(self, data: UserCreate) -> User:
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un usuario con este email",
            )

        user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
        )
        return await self.repo.create(user)

    async def update_user(self, user_id: uuid.UUID, data: UserUpdate) -> User:
        user = await self.get_by_id(user_id)
        update_data = data.model_dump(exclude_unset=True)
        return await self.repo.update(user, update_data)

    async def delete_user(self, user_id: uuid.UUID) -> None:
        user = await self.get_by_id(user_id)
        await self.repo.soft_delete(user)

    async def authenticate(self, email: str, password: str) -> User | None:
        """Valida credenciales. Retorna el usuario si son correctas, None si no."""
        user = await self.repo.get_by_email(email)
        if user is None:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
