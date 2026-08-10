import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.infrastructure import Sede, Edificio, Piso
from app.services.infrastructure_service import InfrastructureService

@pytest.mark.asyncio
async def test_get_reports_all_scopes(db_session: AsyncSession):
    sede = Sede(nombre="Sede Central")
    db_session.add(sede)
    await db_session.flush()

    edificio = Edificio(nombre="Edificio A", codigo="ED-A", sede_id=sede.id)
    db_session.add(edificio)
    await db_session.flush()

    piso = Piso(numero=1, nombre="Primer Piso", edificio_id=edificio.id)
    db_session.add(piso)
    await db_session.commit()

    service = InfrastructureService(db_session)

    # Test Total
    rep_total = await service.get_reports(scope="total")
    assert rep_total.total_sedes == 1
    assert rep_total.total_edificios == 1
    assert rep_total.total_pisos == 1
    assert rep_total.scope_name == "Total General"

    # Test Sede
    rep_sede = await service.get_reports(scope="sede", scope_id=str(sede.id))
    assert rep_sede.total_sedes == 1
    assert rep_sede.total_edificios == 1
    assert rep_sede.total_pisos == 1
    assert "Sede Central" in rep_sede.scope_name

    # Test Edificio
    rep_edif = await service.get_reports(scope="edificio", scope_id=str(edificio.id))
    assert rep_edif.total_sedes == 1
    assert rep_edif.total_edificios == 1
    assert rep_edif.total_pisos == 1
    assert "Edificio A" in rep_edif.scope_name

    # Test Piso
    rep_piso = await service.get_reports(scope="piso", scope_id=str(piso.id))
    assert rep_piso.total_sedes == 1
    assert rep_piso.total_edificios == 1
    assert rep_piso.total_pisos == 1
    assert "Primer Piso" in rep_piso.scope_name

    # Test Edificio con scope_id=None
    rep_edif_none = await service.get_reports(scope="edificio", scope_id=None)
    assert rep_edif_none is not None

    # Test Edificio con UUID inexistente
    random_uuid = str(uuid.uuid4())
    rep_edif_rand = await service.get_reports(scope="edificio", scope_id=random_uuid)
    assert rep_edif_rand is not None


@pytest.mark.asyncio
async def test_reports_endpoint(client: AsyncClient, db_session: AsyncSession):
    # Register & Login
    await client.post("/api/v1/auth/register", json={
        "email": "report_user@test.com",
        "full_name": "Report User",
        "password": "Password123!",
    })
    resp_login = await client.post("/api/v1/auth/login", json={
        "email": "report_user@test.com",
        "password": "Password123!",
    })
    token = resp_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test GET /api/v1/infrastructure/reports
    r1 = await client.get("/api/v1/infrastructure/reports?scope=total", headers=headers)
    assert r1.status_code == 200

    r2 = await client.get("/api/v1/infrastructure/reports?scope=edificio", headers=headers)
    assert r2.status_code == 200

    r3 = await client.get("/api/v1/infrastructure/reports?scope=piso", headers=headers)
    assert r3.status_code == 200
