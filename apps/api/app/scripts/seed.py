"""
Script de seed: pobla la base de datos con datos de prueba.

Uso:
    cd apps/api && source .venv/bin/activate
    python -m app.scripts.seed
"""
import asyncio

from app.core.database import AsyncSessionLocal
from app.core.logging import logger, setup_logging
from app.core.security import hash_password
from app.models.user import User


SEED_USERS = [
    {
        "email": "admin@institucion.cl",
        "full_name": "Administrador del Sistema",
        "password": "admin123456",
        "is_superuser": True,
    },
    {
        "email": "alumno.demo@institucion.cl",
        "full_name": "Alumno Demo",
        "password": "alumno123456",
        "is_superuser": False,
    },
]


async def seed() -> None:
    setup_logging()
    async with AsyncSessionLocal() as session:
        for user_data in SEED_USERS:
            user = User(
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=hash_password(user_data["password"]),
                is_superuser=user_data["is_superuser"],
            )
            session.add(user)
            logger.info(f"Creando usuario: {user_data['email']}")

        await session.commit()
    logger.info("✅ Seed completado")


if __name__ == "__main__":
    asyncio.run(seed())
