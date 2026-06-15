"""Tests de utilidades de seguridad (hashing y JWT)."""
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hashing_roundtrip() -> None:
    plain = "mi-contraseña-segura-123"
    hashed = hash_password(plain)

    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("otra-contraseña", hashed) is False


def test_jwt_create_and_decode() -> None:
    token = create_access_token(subject="user-123", extra_claims={"role": "admin"})
    payload = decode_access_token(token)

    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["role"] == "admin"


def test_jwt_invalid_token_returns_none() -> None:
    assert decode_access_token("token-invalido") is None
