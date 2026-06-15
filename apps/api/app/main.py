"""
Punto de entrada de la aplicación FastAPI.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import logger, setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eventos de inicio y apagado de la aplicación."""
    setup_logging()
    logger.info(f"🚀 {settings.PROJECT_NAME} iniciando en modo {settings.ENVIRONMENT}")
    yield
    logger.info("👋 Apagando aplicación")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# CORS — necesario para que el frontend Next.js (localhost:3000) consuma la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root() -> dict[str, str]:
    """Endpoint raíz informativo."""
    return {
        "name": settings.PROJECT_NAME,
        "docs": "/docs",
        "api": settings.API_V1_PREFIX,
    }
