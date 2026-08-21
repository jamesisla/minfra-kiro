"""
Servicio para gestión de Bienes / Activos Fijos e Inventario Físico.
"""
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.asset import Bien, BienMovimiento
from app.repositories.asset import BienMovimientoRepository, BienRepository
from app.repositories.person import PersonaRepository
from app.repositories.space import EspacioRepository
from app.schemas.asset import (
    AssetSummaryStats,
    BienCreate,
    BienMovimientoRead,
    BienPositionUpdate,
    BienRead,
    BienTransferRequest,
    BienUpdate,
    BienWithDetailsRead,
)


class AssetService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = BienRepository(db)
        self.movimiento_repo = BienMovimientoRepository(db)
        self.espacio_repo = EspacioRepository(db)
        self.persona_repo = PersonaRepository(db)

    def _map_to_details(self, b: Bien) -> BienWithDetailsRead:
        res = BienWithDetailsRead.model_validate(b)
        if b.espacio:
            res.espacio_codigo = b.espacio.codigo
            res.espacio_nombre = b.espacio.nombre
            if b.espacio.piso:
                res.piso_id = b.espacio.piso.id
                res.piso_numero = b.espacio.piso.numero
                if b.espacio.piso.edificio:
                    res.edificio_nombre = b.espacio.piso.edificio.nombre
                    if b.espacio.piso.edificio.sede:
                        res.sede_nombre = b.espacio.piso.edificio.sede.nombre
        if b.custodio:
            res.custodio_nombre = b.custodio.nombre_completo
            res.custodio_cargo = b.custodio.cargo

        res.movimientos = [
            BienMovimientoRead(
                id=m.id,
                bien_id=m.bien_id,
                espacio_origen_id=m.espacio_origen_id,
                espacio_destino_id=m.espacio_destino_id,
                persona_responsable_id=m.persona_responsable_id,
                fecha_traslado=m.fecha_traslado,
                motivo=m.motivo,
                espacio_origen_codigo=m.espacio_origen.codigo if m.espacio_origen else None,
                espacio_destino_codigo=m.espacio_destino.codigo if m.espacio_destino else None,
                persona_responsable_nombre=m.persona_responsable.nombre_completo if m.persona_responsable else None,
                created_at=m.created_at,
            )
            for m in b.movimientos
            if m.deleted_at is None
        ]
        return res

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        categoria: str | None = None,
        estado: str | None = None,
        espacio_id: uuid.UUID | None = None,
        custodio_id: uuid.UUID | None = None,
    ) -> list[BienWithDetailsRead]:
        bienes = await self.repo.list_with_details(
            skip=skip,
            limit=limit,
            categoria=categoria,
            estado=estado,
            espacio_id=espacio_id,
            custodio_id=custodio_id,
        )
        return [self._map_to_details(b) for b in bienes]

    async def list_by_piso(self, piso_id: uuid.UUID) -> list[BienWithDetailsRead]:
        bienes = await self.repo.list_by_piso(piso_id)
        return [self._map_to_details(b) for b in bienes]

    async def list_by_espacio(self, espacio_id: uuid.UUID) -> list[BienWithDetailsRead]:
        bienes = await self.repo.list_by_espacio(espacio_id)
        return [self._map_to_details(b) for b in bienes]

    async def search(self, query: str, limit: int = 30) -> list[BienWithDetailsRead]:
        bienes = await self.repo.search(query=query, limit=limit)
        return [self._map_to_details(b) for b in bienes]

    async def get_by_id(self, bien_id: uuid.UUID) -> BienWithDetailsRead:
        bien = await self.repo.get_with_details(bien_id)
        if not bien:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bien / Activo no encontrado",
            )
        return self._map_to_details(bien)

    async def create(self, data: BienCreate) -> BienWithDetailsRead:
        # Validar unicidad del código patrimonial
        existente = await self.repo.get_by_codigo_patrimonial(data.codigo_patrimonial)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un bien con el código patrimonial '{data.codigo_patrimonial}'",
            )

        if data.espacio_id:
            espacio = await self.espacio_repo.get(data.espacio_id)
            if not espacio:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="El espacio especificado no existe",
                )

        if data.custodio_id:
            custodio = await self.persona_repo.get(data.custodio_id)
            if not custodio:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="La persona custodia especificada no existe",
                )

        bien = Bien(
            codigo_patrimonial=data.codigo_patrimonial.strip().upper(),
            nombre=data.nombre.strip(),
            categoria=data.categoria,
            marca=data.marca.strip() if data.marca else None,
            modelo=data.modelo.strip() if data.modelo else None,
            numero_serie=data.numero_serie.strip() if data.numero_serie else None,
            estado_operativo=data.estado_operativo,
            valor_compra=data.valor_compra,
            fecha_adquisicion=data.fecha_adquisicion,
            fecha_garantia=data.fecha_garantia,
            espacio_id=data.espacio_id,
            custodio_id=data.custodio_id,
            pos_x=data.pos_x,
            pos_y=data.pos_y,
            metadata_extra=data.metadata_extra,
        )
        bien = await self.repo.create(bien)

        # Si se creó directamente en un espacio, registrar movimiento inicial
        if data.espacio_id:
            mov = BienMovimiento(
                bien_id=bien.id,
                espacio_origen_id=None,
                espacio_destino_id=data.espacio_id,
                persona_responsable_id=data.custodio_id,
                motivo="Inventario inicial / Alta de bien",
            )
            await self.movimiento_repo.create(mov)

        return await self.get_by_id(bien.id)

    async def update(self, bien_id: uuid.UUID, data: BienUpdate) -> BienWithDetailsRead:
        bien = await self.repo.get(bien_id)
        if not bien:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bien / Activo no encontrado",
            )

        update_dict = data.model_dump(exclude_unset=True)

        if "codigo_patrimonial" in update_dict and update_dict["codigo_patrimonial"]:
            code_new = update_dict["codigo_patrimonial"].strip().upper()
            if code_new != bien.codigo_patrimonial:
                existente = await self.repo.get_by_codigo_patrimonial(code_new)
                if existente:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Ya existe un bien con el código '{code_new}'",
                    )
            update_dict["codigo_patrimonial"] = code_new

        bien = await self.repo.update(bien, update_dict)
        return await self.get_by_id(bien.id)

    async def update_position(
        self, bien_id: uuid.UUID, data: BienPositionUpdate
    ) -> BienWithDetailsRead:
        bien = await self.repo.get(bien_id)
        if not bien:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bien / Activo no encontrado",
            )
        bien = await self.repo.update(bien, {"pos_x": data.pos_x, "pos_y": data.pos_y})
        return await self.get_by_id(bien.id)

    async def transfer(
        self, bien_id: uuid.UUID, data: BienTransferRequest
    ) -> BienWithDetailsRead:
        bien = await self.repo.get(bien_id)
        if not bien:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bien / Activo no encontrado",
            )

        espacio_destino = await self.espacio_repo.get(data.espacio_destino_id)
        if not espacio_destino:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El espacio de destino no existe",
            )

        origen_id = bien.espacio_id

        # Actualizar ubicación del bien
        bien = await self.repo.update(
            bien, {"espacio_id": data.espacio_destino_id, "pos_x": None, "pos_y": None}
        )

        # Registrar trazabilidad en bien_movimientos
        mov = BienMovimiento(
            bien_id=bien.id,
            espacio_origen_id=origen_id,
            espacio_destino_id=data.espacio_destino_id,
            persona_responsable_id=data.persona_responsable_id,
            motivo=data.motivo,
        )
        await self.movimiento_repo.create(mov)

        return await self.get_by_id(bien.id)

    async def delete(self, bien_id: uuid.UUID) -> None:
        bien = await self.repo.get(bien_id)
        if not bien:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bien / Activo no encontrado",
            )
        await self.repo.soft_delete(bien)

    async def get_stats(self) -> AssetSummaryStats:
        stats = await self.repo.get_stats()
        return AssetSummaryStats(**stats)
