"""Repositorio de Usuarios."""
from sqlalchemy import select

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        """Busca un usuario por email (case-insensitive)."""
        stmt = select(User).where(
            func_lower_eq(User.email, email), User.deleted_at.is_(None)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()


def func_lower_eq(column, value: str):
    """Helper para comparación case-insensitive de email."""
    from sqlalchemy import func

    return func.lower(column) == value.lower()
