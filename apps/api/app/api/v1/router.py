"""Agrega todos los routers de la v1 de la API."""
from fastapi import APIRouter

from app.api.v1.routes import auth, health, infrastructure, users

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(infrastructure.router)
