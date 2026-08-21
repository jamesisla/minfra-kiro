"""Agrega todos los routers de la v1 de la API."""
from fastapi import APIRouter

from app.api.v1.routes import (
    auth,
    health,
    infrastructure,
    organizations,
    people,
    spaces,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(infrastructure.router)
api_router.include_router(organizations.router)
api_router.include_router(people.router)
api_router.include_router(spaces.router)
