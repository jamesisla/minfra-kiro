"""Test de integración: flujo completo de registro y login."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient) -> None:
    # 1. Registrar usuario
    register_payload = {
        "email": "estudiante@ejemplo.cl",
        "full_name": "Estudiante de Prueba",
        "password": "claveSegura123",
    }
    response = await client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == register_payload["email"]
    assert "hashed_password" not in data

    # 2. Login con las mismas credenciales
    login_payload = {
        "email": register_payload["email"],
        "password": register_payload["password"],
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_with_wrong_password_fails(client: AsyncClient) -> None:
    register_payload = {
        "email": "otro@ejemplo.cl",
        "full_name": "Otro Usuario",
        "password": "claveCorrecta123",
    }
    await client.post("/api/v1/auth/register", json=register_payload)

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": register_payload["email"], "password": "claveIncorrecta"},
    )
    assert response.status_code == 401
