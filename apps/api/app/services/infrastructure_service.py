"""
Servicio de infraestructura universitaria.
Orquesta sedes, edificios, pisos y procesamiento de DXF.
"""
import json
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.infrastructure import Edificio, Espacio, Piso, PlanoItem, Sede
from app.repositories.infrastructure import (
    EdificioRepository,
    PisoRepository,
    PlanoItemRepository,
    SedeRepository,
)
from app.schemas.infrastructure import (
    CategoryReport,
    DxfUploadResult,
    EdificioCreate,
    EdificioRead,
    EdificioTreeItem,
    EdificioUpdate,
    InfrastructureTree,
    ItemReportDetail,
    PlanoItemRead,
    PlanoItemUpdate,
    PisoCreate,
    PisoRead,
    PisoReadWithSVG,
    PisoTreeItem,
    PisoUpdate,
    ReportSummary,
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
        stmt_edificios = select(Edificio.id).where(Edificio.sede_id == sede_id)
        edificio_ids = list((await self.db.scalars(stmt_edificios)).all())

        if edificio_ids:
            stmt_pisos = select(Piso.id).where(Piso.edificio_id.in_(edificio_ids))
            piso_ids = list((await self.db.scalars(stmt_pisos)).all())

            if piso_ids:
                await self.db.execute(delete(PlanoItem).where(PlanoItem.piso_id.in_(piso_ids)))
                await self.db.execute(delete(Piso).where(Piso.id.in_(piso_ids)))

            await self.db.execute(delete(Edificio).where(Edificio.id.in_(edificio_ids)))

        await self.db.execute(delete(Sede).where(Sede.id == sede_id))
        await self.db.commit()

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
        stmt_pisos = select(Piso.id).where(Piso.edificio_id == edificio_id)
        piso_ids = list((await self.db.scalars(stmt_pisos)).all())

        if piso_ids:
            await self.db.execute(delete(PlanoItem).where(PlanoItem.piso_id.in_(piso_ids)))
            await self.db.execute(delete(Piso).where(Piso.id.in_(piso_ids)))

        await self.db.execute(delete(Edificio).where(Edificio.id == edificio_id))
        await self.db.commit()

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
        await self.db.execute(delete(PlanoItem).where(PlanoItem.piso_id == piso_id))
        await self.db.execute(delete(Piso).where(Piso.id == piso_id))
        await self.db.commit()


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

        # Obtener los espacios existentes del piso para re-vincular de forma no destructiva
        stmt_espacios = select(Espacio).where(
            Espacio.piso_id == piso_id, Espacio.deleted_at.is_(None)
        )
        existing_espacios = list((await self.db.scalars(stmt_espacios)).all())
        espacios_by_code: dict[str, Espacio] = {
            e.codigo.upper(): e for e in existing_espacios if e.codigo
        }

        # Crear los PlanoItems (con sanitización de longitudes de campos y enlace a Espacio)
        items_created = 0
        for entity in result.entities:
            try:
                meta = dict(entity.metadata) if entity.metadata else {}
                meta["svg_element"] = entity.svg_element

                nombre_clean = entity.nombre[:490] if entity.nombre is not None else None
                capa_clean = entity.capa[:240] if entity.capa is not None else None
                tipo_clean = (entity.tipo or "DEFAULT")[:90]

                # Sincronización o asignación a entidad Espacio
                espacio_id = None
                code_candidate = (meta.get("codigo") or nombre_clean or "").strip()
                if code_candidate:
                    code_key = code_candidate.upper()
                    if code_key in espacios_by_code:
                        espacio_obj = espacios_by_code[code_key]
                        # Actualizar m² si el procesador CAD calculó área
                        if meta.get("area_m2") and not espacio_obj.area_m2:
                            try:
                                espacio_obj.area_m2 = float(meta["area_m2"])
                            except (ValueError, TypeError):
                                pass
                        if meta.get("perimetro_m") and not espacio_obj.perimetro_m:
                            try:
                                espacio_obj.perimetro_m = float(meta["perimetro_m"])
                            except (ValueError, TypeError):
                                pass
                        espacio_id = espacio_obj.id
                    elif tipo_clean in (
                        "SALA", "LABORATORIO", "OFICINA", "BAÑO", "PASILLO",
                        "ESCALERA", "ASCENSOR", "SALA_SERVIDORES", "DEPOSITO",
                        "COMEDOR", "CAFETERIA", "BIBLIOTECA", "AUDITORIO", "SALA_REUNION", "AREA"
                    ):
                        area_val = None
                        perim_val = None
                        if meta.get("area_m2"):
                            try:
                                area_val = float(meta["area_m2"])
                            except (ValueError, TypeError):
                                pass
                        if meta.get("perimetro_m"):
                            try:
                                perim_val = float(meta["perimetro_m"])
                            except (ValueError, TypeError):
                                pass

                        new_espacio = Espacio(
                            piso_id=piso_id,
                            codigo=code_candidate[:90],
                            nombre=nombre_clean,
                            tipo=tipo_clean,
                            estado="Disponible",
                            capacidad=0,
                            area_m2=area_val,
                            perimetro_m=perim_val,
                        )
                        self.db.add(new_espacio)
                        await self.db.flush()
                        espacios_by_code[code_key] = new_espacio
                        espacio_id = new_espacio.id

                item = PlanoItem(
                    piso_id=piso_id,
                    espacio_id=espacio_id,
                    tipo=tipo_clean,
                    nombre=nombre_clean,
                    capa=capa_clean,
                    x=entity.x if entity.x is not None else None,
                    y=entity.y if entity.y is not None else None,
                    ancho=entity.ancho if entity.ancho is not None else None,
                    alto=entity.alto if entity.alto is not None else None,
                    metadata_extra=json.dumps(meta, ensure_ascii=False, default=str),
                )
                self.db.add(item)
                items_created += 1
            except Exception as e:
                continue

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

    # ── Reportes & Métricas ───────────────────────────────────────────────

    async def get_reports(self, scope: str = "total", scope_id: str | None = None) -> ReportSummary:
        """
        Calcula reporte consolidado o filtrado por Sede, Edificio o Piso.
        """
        scope_clean = (scope or "total").lower()
        scope_name = "Total General"
        target_uuid = None

        if scope_id:
            try:
                target_uuid = uuid.UUID(scope_id.strip("/"))
            except (ValueError, AttributeError):
                pass

        sede_obj = None
        edif_obj = None
        piso_obj = None

        if scope_clean == "sede" and target_uuid:
            sede_obj = await self.sede_repo.get(target_uuid)
            if sede_obj:
                scope_name = f"Sede: {sede_obj.nombre}"
        elif scope_clean == "edificio" and target_uuid:
            edif_obj = await self.edificio_repo.get(target_uuid)
            if edif_obj:
                scope_name = f"Edificio: {edif_obj.nombre}"
                sede_obj = await self.sede_repo.get(edif_obj.sede_id)
                if sede_obj:
                    scope_name = f"{sede_obj.nombre} › Edificio: {edif_obj.nombre}"
        elif scope_clean == "piso" and target_uuid:
            piso_obj = await self.piso_repo.get(target_uuid)
            if piso_obj:
                piso_label = piso_obj.nombre if piso_obj.nombre else f"Piso {piso_obj.numero}"
                scope_name = f"Piso {piso_obj.numero}"
                edif_obj = await self.edificio_repo.get(piso_obj.edificio_id)
                if edif_obj:
                    sede_obj = await self.sede_repo.get(edif_obj.sede_id)
                    if sede_obj:
                        scope_name = f"{sede_obj.nombre} › {edif_obj.nombre} › {piso_label}"

        # Query optimizada de recintos (selecciona columnas especificas para evitar sobrecarga de objetos ORM)
        stmt = (
            select(
                PlanoItem.id,
                PlanoItem.tipo,
                PlanoItem.nombre,
                PlanoItem.capa,
                PlanoItem.metadata_extra,
                Piso.id.label("piso_id"),
                Piso.nombre.label("piso_nombre"),
                Piso.numero.label("piso_numero"),
                Edificio.id.label("edificio_id"),
                Edificio.nombre.label("edificio_nombre"),
                Sede.id.label("sede_id"),
                Sede.nombre.label("sede_nombre"),
            )
            .join(Piso, PlanoItem.piso_id == Piso.id)
            .join(Edificio, Piso.edificio_id == Edificio.id)
            .join(Sede, Edificio.sede_id == Sede.id)
            .where(
                PlanoItem.deleted_at.is_(None),
                Piso.deleted_at.is_(None),
                Edificio.deleted_at.is_(None),
                Sede.deleted_at.is_(None),
            )
        )

        if scope_clean == "sede" and target_uuid:
            stmt = stmt.where(Sede.id == target_uuid)
        elif scope_clean == "edificio" and target_uuid:
            stmt = stmt.where(Edificio.id == target_uuid)
        elif scope_clean == "piso" and target_uuid:
            stmt = stmt.where(Piso.id == target_uuid)

        res = await self.db.execute(stmt)
        rows = res.all()

        # Conteos exactos ultra-rapidos usando COUNT en la base de datos
        sedes_count_stmt = select(func.count(Sede.id)).where(Sede.deleted_at.is_(None))
        edifs_count_stmt = select(func.count(Edificio.id)).where(Edificio.deleted_at.is_(None))
        pisos_count_stmt = select(func.count(Piso.id)).where(Piso.deleted_at.is_(None))

        if scope_clean == "sede" and target_uuid:
            sedes_count_stmt = sedes_count_stmt.where(Sede.id == target_uuid)
            edifs_count_stmt = edifs_count_stmt.where(Edificio.sede_id == target_uuid)
            pisos_count_stmt = pisos_count_stmt.join(Edificio, Piso.edificio_id == Edificio.id).where(
                Edificio.sede_id == target_uuid, Edificio.deleted_at.is_(None)
            )
        elif scope_clean == "edificio" and target_uuid:
            edifs_count_stmt = edifs_count_stmt.where(Edificio.id == target_uuid)
            pisos_count_stmt = pisos_count_stmt.where(Piso.edificio_id == target_uuid)
            if edif_obj:
                sedes_count_stmt = sedes_count_stmt.where(Sede.id == edif_obj.sede_id)
        elif scope_clean == "piso" and target_uuid:
            pisos_count_stmt = pisos_count_stmt.where(Piso.id == target_uuid)
            if piso_obj:
                edifs_count_stmt = edifs_count_stmt.where(Edificio.id == piso_obj.edificio_id)
                if edif_obj:
                    sedes_count_stmt = sedes_count_stmt.where(Sede.id == edif_obj.sede_id)

        res_sedes = await self.db.execute(sedes_count_stmt)
        res_edifs = await self.db.execute(edifs_count_stmt)
        res_pisos = await self.db.execute(pisos_count_stmt)

        total_sedes_cnt = res_sedes.scalar() or 0
        total_edifs_cnt = res_edifs.scalar() or 0
        total_pisos_cnt = res_pisos.scalar() or 0

        TYPE_LABELS = {
            "PARED": "Muros y Estructura",
            "COLUMNA": "Columnas",
            "AREA": "Áreas Generales",
            "SALA": "Salas de Clases / Aulas",
            "LABORATORIO": "Laboratorios",
            "OFICINA": "Oficinas / Despachos",
            "BAÑO": "Baños / Sanitarios",
            "PASILLO": "Pasillos / Circulación",
            "ESCALERA": "Escaleras",
            "ASCENSOR": "Ascensores",
            "SALA_SERVIDORES": "Salas de Servidores",
            "DEPOSITO": "Depósitos / Almacén",
            "COMEDOR": "Comedor / Cafetería",
            "BIBLIOTECA": "Biblioteca",
            "AUDITORIO": "Auditorio",
            "SALA_REUNION": "Salas de Reuniones",
            "CARPINTERIA": "Puertas / Ventanas",
            "MOBILIARIO": "Mobiliario",
            "EQUIPO": "Equipos",
            "TEXTO": "Etiquetas de Texto",
            "DEFAULT": "General",
        }

        ROOM_TYPES = {
            "SALA", "OFICINA", "LABORATORIO", "BAÑO", "PASILLO",
            "ESCALERA", "ASCENSOR", "SALA_SERVIDORES", "DEPOSITO",
            "COMEDOR", "BIBLIOTECA", "AUDITORIO", "SALA_REUNION", "AREA"
        }

        category_stats: dict[str, dict] = {}
        items_detail: list[ItemReportDetail] = []
        total_area = 0.0
        total_recintos = 0

        sedes_set = set()
        edificios_set = set()
        pisos_set = set()

        def _safe_float(val: Any) -> float | None:
            if val is None:
                return None
            try:
                f = float(val)
                import math
                if math.isnan(f) or math.isinf(f):
                    return None
                return f
            except (ValueError, TypeError):
                return None

        for item_id, item_tipo, item_nombre, item_capa, item_metadata_extra, piso_id, piso_nombre, piso_numero, edif_id, edif_nombre, sede_id, sede_nombre in rows:
            sedes_set.add(sede_id)
            edificios_set.add(edif_id)
            pisos_set.add(piso_id)

            area_m2 = None
            perim_m = None
            if item_metadata_extra:
                try:
                    meta = json.loads(item_metadata_extra)
                    if isinstance(meta, dict):
                        area_m2 = meta.get("area_m2")
                        perim_m = meta.get("perimetro_m")
                except Exception:
                    pass

            parsed_area = _safe_float(area_m2)
            parsed_perim = _safe_float(perim_m)
            tipo = item_tipo or "DEFAULT"

            # Elementos estructurales o secundarios que no constituyen recintos/espacios funcionales
            NON_ROOM_TYPES = {"PARED", "COLUMNA", "CARPINTERIA", "VENTANA", "MOBILIARIO", "EQUIPO", "TEXTO", "COTA", "PROYECCION"}
            is_structural_or_meta = tipo in NON_ROOM_TYPES
            is_known_room = tipo in ROOM_TYPES
            has_valid_area = parsed_area is not None and parsed_area >= 1.0
            has_room_name = item_nombre is not None and len(item_nombre.strip()) > 0 and not is_structural_or_meta

            # Es recinto si no es un elemento estructural/gráfico y (es tipo recinto conocido o polígono general con área m² >= 1.0)
            is_recinto = not is_structural_or_meta and (is_known_room or ((tipo in ("DEFAULT", "AREA")) and (has_valid_area or has_room_name)))

            if tipo not in category_stats:
                category_stats[tipo] = {
                    "label": TYPE_LABELS.get(tipo, tipo.title()),
                    "cantidad": 0,
                    "area": 0.0,
                }

            category_stats[tipo]["cantidad"] += 1

            # Sumar superficie si es un área válida y no un elemento estructural/decorativo
            if parsed_area and parsed_area > 0:
                category_stats[tipo]["area"] += parsed_area
                if is_recinto:
                    total_area += parsed_area

            if is_recinto:
                total_recintos += 1
                items_detail.append(ItemReportDetail(
                    id=item_id,
                    nombre=item_nombre,
                    tipo=tipo,
                    capa=item_capa,
                    area_m2=round(parsed_area, 2) if parsed_area is not None else None,
                    perimetro_m=round(parsed_perim, 2) if parsed_perim is not None else None,
                    sede_nombre=sede_nombre,
                    edificio_nombre=edif_nombre,
                    piso_nombre=piso_nombre or f"Piso {piso_numero}",
                ))

        # Ordenar items_detail: primero recintos con nombre y área m², luego por área descendente
        items_detail.sort(
            key=lambda x: (
                0 if x.nombre and x.tipo in ROOM_TYPES else (1 if x.tipo in ROOM_TYPES else 2),
                -(x.area_m2 or 0.0)
            )
        )

        cat_list: list[CategoryReport] = []
        for tipo, data in sorted(category_stats.items(), key=lambda x: x[1]["area"], reverse=True):
            pct = (data["area"] / total_area * 100.0) if total_area > 0 else 0.0
            cat_list.append(CategoryReport(
                tipo=tipo,
                label=data["label"],
                cantidad=data["cantidad"],
                area_total_m2=round(data["area"], 2),
                porcentaje_area=round(pct, 1),
            ))

        return ReportSummary(
            scope=scope_clean,
            scope_id=scope_id,
            scope_name=scope_name,
            total_area_m2=round(total_area, 2),
            total_recintos=total_recintos,
            total_sedes=total_sedes_cnt,
            total_edificios=total_edifs_cnt,
            total_pisos=total_pisos_cnt,
            categorias=cat_list,
            items_detalle=items_detail,
        )


