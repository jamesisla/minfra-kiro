"""
Servicio de infraestructura universitaria.
Orquesta sedes, edificios, pisos y procesamiento de DXF.
"""
import json
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.infrastructure import Edificio, Piso, PlanoItem, Sede
from app.repositories.infrastructure import (
    EdificioRepository,
    PisoRepository,
    PlanoItemRepository,
    SedeRepository,
)
from app.schemas.infrastructure import (
    DxfUploadResult,
    EdificioCreate,
    EdificioRead,
    EdificioTreeItem,
    EdificioUpdate,
    InfrastructureTree,
    PlanoItemRead,
    PlanoItemUpdate,
    PisoCreate,
    PisoRead,
    PisoReadWithSVG,
    PisoTreeItem,
    PisoUpdate,
    SedeCreate,
    SedeRead,
    SedeTreeItem,
    SedeUpdate,
)
from app.services.dxf_processor import process_dxf_bytes


class InfrastructureService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.sede_repo = SedeRepository(db)
        self.edificio_repo = EdificioRepository(db)
        self.piso_repo = PisoRepository(db)
        self.item_repo = PlanoItemRepository(db)

    # ── Árbol de navegación ───────────────────────────────────────────────

    async def get_tree(self) -> InfrastructureTree:
        """Retorna el árbol completo sede → edificio → piso."""
        sedes = await self.sede_repo.list_with_edificios()
        tree_sedes: list[SedeTreeItem] = []

        for sede in sedes:
            tree_edificios: list[EdificioTreeItem] = []
            for edificio in sede.edificios:
                if edificio.deleted_at is not None:
                    continue
                tree_pisos: list[PisoTreeItem] = []
                for piso in sorted(edificio.pisos, key=lambda p: p.numero):
                    if piso.deleted_at is not None:
                        continue
                    tree_pisos.append(PisoTreeItem(
                        id=piso.id,
                        numero=piso.numero,
                        nombre=piso.nombre,
                        tiene_plano=piso.svg_data is not None,
                    ))
                tree_edificios.append(EdificioTreeItem(
                    id=edificio.id,
                    nombre=edificio.nombre,
                    codigo=edificio.codigo,
                    pisos=tree_pisos,
                ))
            tree_sedes.append(SedeTreeItem(
                id=sede.id,
                nombre=sede.nombre,
                edificios=tree_edificios,
            ))

        return InfrastructureTree(sedes=tree_sedes)

    # ── Sedes ─────────────────────────────────────────────────────────────

    async def list_sedes(self) -> list[SedeRead]:
        sedes = await self.sede_repo.list()
        return [SedeRead.model_validate(s) for s in sedes]

    async def create_sede(self, data: SedeCreate) -> SedeRead:
        sede = Sede(
            nombre=data.nombre,
            descripcion=data.descripcion,
            direccion=data.direccion,
        )
        sede = await self.sede_repo.create(sede)
        return SedeRead.model_validate(sede)

    async def get_sede(self, sede_id: uuid.UUID) -> SedeRead:
        sede = await self.sede_repo.get(sede_id)
        if not sede:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sede no encontrada")
        return SedeRead.model_validate(sede)

    async def update_sede(self, sede_id: uuid.UUID, data: SedeUpdate) -> SedeRead:
        sede = await self.sede_repo.get(sede_id)
        if not sede:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sede no encontrada")
        update_data = data.model_dump(exclude_unset=True)
        sede = await self.sede_repo.update(sede, update_data)
        return SedeRead.model_validate(sede)

    async def delete_sede(self, sede_id: uuid.UUID) -> None:
        sede = await self.sede_repo.get(sede_id)
        if not sede:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sede no encontrada")
        await self.sede_repo.delete(sede)

    # ── Edificios ─────────────────────────────────────────────────────────

    async def list_edificios(self, sede_id: uuid.UUID) -> list[EdificioRead]:
        edificios = await self.edificio_repo.list_by_sede(sede_id)
        return [EdificioRead.model_validate(e) for e in edificios]

    async def create_edificio(self, data: EdificioCreate) -> EdificioRead:
        # Verificar que la sede existe
        sede = await self.sede_repo.get(data.sede_id)
        if not sede:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sede no encontrada")
        edificio = Edificio(
            nombre=data.nombre,
            codigo=data.codigo,
            descripcion=data.descripcion,
            sede_id=data.sede_id,
        )
        edificio = await self.edificio_repo.create(edificio)
        return EdificioRead.model_validate(edificio)

    async def update_edificio(self, edificio_id: uuid.UUID, data: EdificioUpdate) -> EdificioRead:
        edificio = await self.edificio_repo.get(edificio_id)
        if not edificio:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edificio no encontrado")
        update_data = data.model_dump(exclude_unset=True)
        edificio = await self.edificio_repo.update(edificio, update_data)
        return EdificioRead.model_validate(edificio)

    async def delete_edificio(self, edificio_id: uuid.UUID) -> None:
        edificio = await self.edificio_repo.get(edificio_id)
        if not edificio:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edificio no encontrado")
        await self.edificio_repo.delete(edificio)

    # ── Pisos ─────────────────────────────────────────────────────────────

    async def list_pisos(self, edificio_id: uuid.UUID) -> list[PisoRead]:
        pisos = await self.piso_repo.list_by_edificio(edificio_id)
        return [PisoRead.model_validate(p) for p in pisos]

    async def create_piso(self, data: PisoCreate) -> PisoRead:
        edificio = await self.edificio_repo.get(data.edificio_id)
        if not edificio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Edificio no encontrado"
            )
        piso = Piso(
            numero=data.numero,
            nombre=data.nombre,
            edificio_id=data.edificio_id,
        )
        piso = await self.piso_repo.create(piso)
        return PisoRead.model_validate(piso)

    async def update_piso(self, piso_id: uuid.UUID, data: PisoUpdate) -> PisoRead:
        piso = await self.piso_repo.get(piso_id)
        if not piso:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Piso no encontrado")
        update_data = data.model_dump(exclude_unset=True)
        piso = await self.piso_repo.update(piso, update_data)
        return PisoRead.model_validate(piso)

    async def delete_piso(self, piso_id: uuid.UUID) -> None:
        piso = await self.piso_repo.get(piso_id)
        if not piso:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Piso no encontrado")
        await self.piso_repo.delete(piso)


    async def get_piso_with_svg(self, piso_id: uuid.UUID) -> PisoReadWithSVG:
        piso = await self.piso_repo.get_with_items(piso_id)
        if not piso:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Piso no encontrado")
        return PisoReadWithSVG.model_validate(piso)


    # ── Procesamiento DXF ─────────────────────────────────────────────────

    async def upload_dxf(
        self,
        piso_id: uuid.UUID,
        filename: str,
        content: bytes,
    ) -> DxfUploadResult:
        """
        Procesa un archivo DXF y lo asocia a un piso.
        Si el piso ya tenía un plano, se reemplaza.
        """
        piso = await self.piso_repo.get(piso_id)
        if not piso:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Piso no encontrado")

        try:
            result = process_dxf_bytes(content, filename)
        except RuntimeError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e),
            ) from e

        # Eliminar items anteriores
        await self.item_repo.delete_by_piso(piso_id)

        # Actualizar el piso con los datos del SVG
        piso = await self.piso_repo.update(piso, {
            "archivo_dxf": filename,
            "svg_data": result.svg,
            "min_x": result.min_x,
            "min_y": result.min_y,
            "max_x": result.max_x,
            "max_y": result.max_y,
        })

        # Crear los PlanoItems
        items_created = 0
        for entity in result.entities:
            meta = dict(entity.metadata) if entity.metadata else {}
            meta["svg_element"] = entity.svg_element
            item = PlanoItem(
                piso_id=piso_id,
                tipo=entity.tipo,
                nombre=entity.nombre,
                capa=entity.capa,
                x=entity.x,
                y=entity.y,
                ancho=entity.ancho,
                alto=entity.alto,
                metadata_extra=json.dumps(meta),
            )
            self.db.add(item)
            items_created += 1

        await self.db.commit()

        return DxfUploadResult(
            piso_id=piso_id,
            archivo=filename,
            entidades_procesadas=items_created,
            mensaje=f"DXF procesado correctamente: {items_created} entidades importadas.",
        )

    # ── Edición de PlanoItems ───────────────────────────────────────────────

    async def update_item(self, item_id: uuid.UUID, data: PlanoItemUpdate) -> PlanoItemRead:
        item = await self.item_repo.get(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elemento no encontrado")
        update_data = data.model_dump(exclude_unset=True)
        item = await self.item_repo.update(item, update_data)
        return PlanoItemRead.model_validate(item)

