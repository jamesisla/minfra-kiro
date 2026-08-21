"""
Repositorio para Documentos y Cumplimiento Normativo / Compliance.
"""
import uuid
from datetime import date, timedelta
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload
from app.models.document import Documento
from app.models.infrastructure import Edificio, Espacio, Piso, Sede
from app.models.asset import Bien
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Documento]):
    model = Documento

    async def list_with_filters(
        self,
        skip: int = 0,
        limit: int = 100,
        tipo_documento: str | None = None,
        sede_id: uuid.UUID | None = None,
        edificio_id: uuid.UUID | None = None,
        piso_id: uuid.UUID | None = None,
        espacio_id: uuid.UUID | None = None,
        bien_id: uuid.UUID | None = None,
        estado_vencimiento: str | None = None,
        search: str | None = None,
    ) -> list[Documento]:
        today = date.today()
        stmt = (
            select(Documento)
            .where(Documento.deleted_at.is_(None))
            .options(
                selectinload(Documento.sede),
                selectinload(Documento.edificio),
                selectinload(Documento.piso),
                selectinload(Documento.espacio),
                selectinload(Documento.bien),
            )
        )

        if tipo_documento:
            stmt = stmt.where(Documento.tipo_documento == tipo_documento)
        if sede_id:
            stmt = stmt.where(Documento.sede_id == sede_id)
        if edificio_id:
            stmt = stmt.where(Documento.edificio_id == edificio_id)
        if piso_id:
            stmt = stmt.where(Documento.piso_id == piso_id)
        if espacio_id:
            stmt = stmt.where(Documento.espacio_id == espacio_id)
        if bien_id:
            stmt = stmt.where(Documento.bien_id == bien_id)

        if search:
            pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    Documento.nombre.ilike(pattern),
                    Documento.descripcion.ilike(pattern),
                    Documento.emisor_entidad.ilike(pattern),
                    Documento.numero_folio.ilike(pattern),
                    Documento.archivo_nombre.ilike(pattern),
                )
            )

        if estado_vencimiento:
            if estado_vencimiento == "VENCIDO":
                stmt = stmt.where(
                    Documento.fecha_vencimiento.is_not(None),
                    Documento.fecha_vencimiento < today,
                )
            elif estado_vencimiento == "POR_VENCER_30":
                stmt = stmt.where(
                    Documento.fecha_vencimiento.is_not(None),
                    Documento.fecha_vencimiento >= today,
                    Documento.fecha_vencimiento <= today + timedelta(days=30),
                )
            elif estado_vencimiento == "POR_VENCER_60":
                stmt = stmt.where(
                    Documento.fecha_vencimiento.is_not(None),
                    Documento.fecha_vencimiento > today + timedelta(days=30),
                    Documento.fecha_vencimiento <= today + timedelta(days=60),
                )
            elif estado_vencimiento == "VIGENTE":
                stmt = stmt.where(
                    or_(
                        Documento.fecha_vencimiento.is_(None),
                        Documento.fecha_vencimiento > today + timedelta(days=60),
                    )
                )
            elif estado_vencimiento == "SIN_VENCIMIENTO":
                stmt = stmt.where(Documento.fecha_vencimiento.is_(None))

        stmt = stmt.offset(skip).limit(limit).order_by(
            Documento.fecha_vencimiento.asc().nulls_last(),
            Documento.created_at.desc(),
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_espacio(self, espacio_id: uuid.UUID) -> list[Documento]:
        stmt = (
            select(Documento)
            .where(
                Documento.espacio_id == espacio_id,
                Documento.deleted_at.is_(None),
            )
            .options(
                selectinload(Documento.espacio),
            )
            .order_by(Documento.fecha_vencimiento.asc().nulls_last(), Documento.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_bien(self, bien_id: uuid.UUID) -> list[Documento]:
        stmt = (
            select(Documento)
            .where(
                Documento.bien_id == bien_id,
                Documento.deleted_at.is_(None),
            )
            .options(
                selectinload(Documento.bien),
            )
            .order_by(Documento.fecha_vencimiento.asc().nulls_last(), Documento.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_with_details(self, documento_id: uuid.UUID) -> Documento | None:
        stmt = (
            select(Documento)
            .where(
                Documento.id == documento_id,
                Documento.deleted_at.is_(None),
            )
            .options(
                selectinload(Documento.sede),
                selectinload(Documento.edificio),
                selectinload(Documento.piso),
                selectinload(Documento.espacio),
                selectinload(Documento.bien),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_active_for_compliance(self) -> list[Documento]:
        stmt = (
            select(Documento)
            .where(Documento.deleted_at.is_(None))
            .options(
                selectinload(Documento.sede),
                selectinload(Documento.edificio),
                selectinload(Documento.piso),
                selectinload(Documento.espacio),
                selectinload(Documento.bien),
            )
            .order_by(Documento.fecha_vencimiento.asc().nulls_last())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
