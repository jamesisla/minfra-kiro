"""
Script de seed para crear la estructura de ejemplo:
  - Sede 1 → Edificio A → Pisos 1, 2, 3 (archivos S1_A_1, S1_A_2, S1_A_3)
  - Sede 1 → Edificio B (vacío)
  - Sede 2 → Edificio C → Piso 1

Uso:
  cd apps/api
  python -m app.scripts.seed_infrastructure
"""
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.infrastructure import Edificio, Piso, Sede


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as db:
        # ── Sede 1 ────────────────────────────────────────────────────────
        sede1 = Sede(
            nombre="Sede Central",
            descripcion="Campus principal",
            direccion="Av. Principal 100",
        )
        db.add(sede1)
        await db.flush()

        edificio_a = Edificio(
            nombre="Edificio A",
            codigo="A",
            descripcion="Edificio de Aulas",
            sede_id=sede1.id,
        )
        edificio_b = Edificio(
            nombre="Edificio B",
            codigo="B",
            descripcion="Edificio Administrativo",
            sede_id=sede1.id,
        )
        db.add(edificio_a)
        db.add(edificio_b)
        await db.flush()

        for num in range(1, 4):
            piso = Piso(
                numero=num,
                nombre=f"Piso {num}" if num > 0 else "Planta Baja",
                edificio_id=edificio_a.id,
                archivo_dxf=f"S1_A_{num}.dxf",
            )
            db.add(piso)

        # ── Sede 2 ────────────────────────────────────────────────────────
        sede2 = Sede(
            nombre="Sede Norte",
            descripcion="Campus Norte",
            direccion="Calle Norte 200",
        )
        db.add(sede2)
        await db.flush()

        edificio_c = Edificio(
            nombre="Edificio C",
            codigo="C",
            sede_id=sede2.id,
        )
        db.add(edificio_c)
        await db.flush()

        piso_c1 = Piso(numero=1, nombre="Piso 1", edificio_id=edificio_c.id)
        db.add(piso_c1)

        await db.commit()
        print("✅ Seed de infraestructura completado.")
        print(f"   Sede 1 (ID: {sede1.id}): Edificio A (3 pisos), Edificio B")
        print(f"   Sede 2 (ID: {sede2.id}): Edificio C (1 piso)")


if __name__ == "__main__":
    asyncio.run(seed())
