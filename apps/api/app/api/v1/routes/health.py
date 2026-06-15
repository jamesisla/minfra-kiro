"""Endpoint de healthcheck — usado por monitoreo y CI."""
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Verifica que la API está activa."""
    return {"status": "ok"}
