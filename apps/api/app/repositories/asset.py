"""
Repositorios para Bienes / Activos Fijos e Historial de Movimientos.
"""
import uuid
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload
from app.models.asset import Bien, BienMovimiento
from app.models.infrastructure import Edificio, Espacio, Piso, Sede
from app.repositories.base import BaseRepository


class BienRepository(BaseRepository[Bien]):
    model = Bien

    async def list_with_details(
        self,
        skip: int = 0,
        limit: int = 100,
        categoria: str | None = None,
        estado: str | None = None,
        espacio_id: uuid.UUID | None = None,
        custodio_id: uuid.UUID | None = None,
    ) -> list[Bien]:
        stmt = (
            select(Bien)
            .where(Bien.deleted_at.is_(None))
            .options(
                selectinload(Bien.espacio)
                .selectinload(Espacio.piso)
                .selectinload(Piso.edificio)
                .selectinload(Edificio.sede),
                selectinload(Bien.custodio),
                selectinload(Bien.movimientos).selectinload(BienMovimiento.espacio_origen),
                selectinload(Bien.movimientos).selectinload(BienMovimiento.espacio_destino),
                selectinload(Bien.movimientos).selectinload(BienMovimiento.persona_responsable),
            )
        )
        if categoria:
            stmt = stmt.where(Bien.categoria == categoria)
        if estado:
            stmt = stmt.where(Bien.estado_operativo == estado)
        if espacio_id:
            stmt = stmt.where(Bien.espacio_id == espacio_id)
        if custodio_id:
            stmt = stmt.where(Bien.custodio_id == custodio_id)

        stmt = stmt.offset(skip).limit(limit).order_by(Bien.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_piso(self, piso_id: uuid.UUID) -> list[Bien]:
        """Obtiene todos los bienes asociados a recintos de un piso específico."""
        stmt = (
            select(Bien)
            .join(Espacio, Bien.espacio_id == Espacio.id)
            .where(
                Espacio.piso_id == piso_id,
                Bien.deleted_at.is_(None),
                Espacio.deleted_at.is_(None),
            )
            .options(
                selectinload(Bien.espacio),
                selectinload(Bien.custodio),
            )
            .order_by(Bien.nombre)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_espacio(self, espacio_id: uuid.UUID) -> list[Bien]:
        stmt = (
            select(Bien)
            .where(Bien.espacio_id == espacio_id, Bien.deleted_at.is_(None))
            .options(
                selectinload(Bien.custodio),
                selectinload(Bien.movimientos),
            )
            .order_by(Bien.nombre)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_codigo_patrimonial(self, codigo: str) -> Bien | None:
        stmt = select(Bien).where(
            Bien.codigo_patrimonial == codigo, Bien.deleted_at.is_(None)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_with_details(self, bien_id: uuid.UUID) -> Bien | None:
        stmt = (
            select(Bien)
            .where(Bien.id == bien_id, Bien.deleted_at.is_(None))
            .options(
                selectinload(Bien.espacio)
                .selectinload(Espacio.piso)
                .selectinload(Piso.edificio)
                .selectinload(Edificio.sede),
                selectinload(Bien.custodio),
                selectinload(Bien.movimientos).selectinload(BienMovimiento.espacio_origen),
                selectinload(Bien.movimientos).selectinload(BienMovimiento.espacio_destino),
                selectinload(Bien.movimientos).selectinload(BienMovimiento.persona_responsable),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def search(self, query: str, limit: int = 30) -> list[Bien]:
        pattern = f"%{query.strip()}%"
        stmt = (
            select(Bien)
            .where(
                Bien.deleted_at.is_(None),
                or_(
                    Bien.codigo_patrimonial.ilike(pattern),
                    Bien.nombre.ilike(pattern),
                    Bien.marca.ilike(pattern),
                    Bien.modelo.ilike(pattern),
                    Bien.numero_serie.ilike(pattern),
                ),
            )
            .options(
                selectinload(Bien.espacio),
                selectinload(Bien.custodio),
            )
            .limit(limit)
            .order_by(Bien.nombre)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_stats(self) -> dict[str, any]:
        total = await self.count()
        
        stmt_estados = (
            select(Bien.estado_operativo, func.count(Bien.id))
            .where(Bien.deleted_at.is_(None))
            .group_by(Bien.estado_operativo)
        )
        estados_res = (await self.db.execute(stmt_estados)).all()
        estados_dict = {row[0]: row[1] for row in estados_res}

        stmt_cats = (
            select(Bien.categoria, func.count(Bien.id))
            .where(Bien.deleted_at.is_(None))
            .group_by(Bien.categoria)
        )
        cats_res = (await self.db.execute(stmt_cats)).all()
        cats_dict = {row[0]: row[1] for row in cats_res}

        return {
            "total_bienes": total,
            "bienes_operativos": estados_dict.get("OPERATIVO", 0),
            "bienes_en_mantencion": estados_dict.get("EN_MANTENCION", 0) + estados_dict.get("EN_REPARACION", 0),
            "bienes_de_baja": estados_dict.get("DE_BAJA", 0),
            "por_categoria": cats_dict,
        }


class BienMovimientoRepository(BaseRepository[BienMovimiento]):
    model = BienMovimiento

    async def list_by_bien(self, bien_id: uuid.UUID) -> list[BienMovimiento]:
        stmt = (
            select(BienMovimiento)
            .where(BienMovimiento.bien_id == bien_id, BienMovimiento.deleted_at.is_(None))
            .options(
                selectinload(BienMovimiento.espacio_origen),
                selectinload(BienMovimiento.espacio_destino),
                selectinload(BienMovimiento.persona_responsable),
            )
            .order_by(BienMovimiento.fecha_traslado.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
