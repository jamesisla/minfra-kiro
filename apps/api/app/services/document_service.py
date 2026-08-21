"""
Servicio para gestión de Documentos y Cumplimiento Normativo / Compliance (Fase 3).
Maneja almacenamiento físico de archivos, cálculo de semáforo de vigencias y métricas.
"""
import os
import re
import uuid
from datetime import date, timedelta
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Documento
from app.repositories.document import DocumentRepository
from app.repositories.infrastructure import EdificioRepository, PisoRepository, SedeRepository
from app.repositories.space import EspacioRepository
from app.repositories.asset import BienRepository
from app.schemas.document import (
    ComplianceAlertSummary,
    DocumentoCreate,
    DocumentoRead,
    DocumentoUpdate,
    ExpirationStatus,
)

STORAGE_DIR = os.environ.get("STORAGE_DIR", "storage/documents")


class DocumentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = DocumentRepository(db)
        self.sede_repo = SedeRepository(db)
        self.edificio_repo = EdificioRepository(db)
        self.piso_repo = PisoRepository(db)
        self.espacio_repo = EspacioRepository(db)
        self.bien_repo = BienRepository(db)

    def _compute_expiration(self, doc: Documento) -> tuple[ExpirationStatus, int | None]:
        if not doc.fecha_vencimiento:
            return "SIN_VENCIMIENTO", None

        today = date.today()
        diff = (doc.fecha_vencimiento - today).days

        if diff < 0:
            return "VENCIDO", diff
        elif diff <= 30:
            return "POR_VENCER_30", diff
        elif diff <= 60:
            return "POR_VENCER_60", diff
        else:
            return "VIGENTE", diff

    def _resolve_associated_entity(self, doc: Documento) -> tuple[str, str]:
        if doc.bien:
            return "BIEN", f"{doc.bien.nombre} ({doc.bien.codigo_patrimonial})"
        elif doc.espacio:
            return "ESPACIO", f"{doc.espacio.nombre or doc.espacio.codigo}"
        elif doc.piso:
            return "PISO", f"{doc.piso.nombre or f'Piso {doc.piso.numero}'}"
        elif doc.edificio:
            return "EDIFICIO", f"{doc.edificio.nombre}"
        elif doc.sede:
            return "SEDE", f"{doc.sede.nombre}"
        return "GENERAL", "Institucional"

    def _map_to_read(self, doc: Documento) -> DocumentoRead:
        status_venc, dias = self._compute_expiration(doc)
        ent_tipo, ent_nombre = self._resolve_associated_entity(doc)

        res = DocumentoRead.model_validate(doc)
        res.estado_vencimiento = status_venc
        res.dias_para_vencer = dias
        res.entidad_asociada_tipo = ent_tipo
        res.entidad_asociada_nombre = ent_nombre
        return res

    def _sanitize_filename(self, filename: str) -> str:
        clean = re.sub(r"[^\w\.-]", "_", filename)
        return clean[:100]

    def _save_file_to_disk(
        self, original_filename: str, content: bytes, mime_type: str | None
    ) -> tuple[str, str, int, str]:
        os.makedirs(STORAGE_DIR, exist_ok=True)
        sanitized = self._sanitize_filename(original_filename)
        unique_name = f"{uuid.uuid4().hex}_{sanitized}"
        file_path = os.path.join(STORAGE_DIR, unique_name)

        with open(file_path, "wb") as f:
            f.write(content)

        size_bytes = len(content)
        detected_mime = mime_type or "application/octet-stream"
        if sanitized.lower().endswith(".pdf"):
            detected_mime = "application/pdf"
        elif sanitized.lower().endswith((".png", ".jpg", ".jpeg")):
            detected_mime = f"image/{sanitized.split('.')[-1].lower()}"

        return file_path, original_filename, size_bytes, detected_mime

    async def list_documents(
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
    ) -> list[DocumentoRead]:
        docs = await self.repo.list_with_filters(
            skip=skip,
            limit=limit,
            tipo_documento=tipo_documento,
            sede_id=sede_id,
            edificio_id=edificio_id,
            piso_id=piso_id,
            espacio_id=espacio_id,
            bien_id=bien_id,
            estado_vencimiento=estado_vencimiento,
            search=search,
        )
        return [self._map_to_read(d) for d in docs]

    async def list_by_espacio(self, espacio_id: uuid.UUID) -> list[DocumentoRead]:
        docs = await self.repo.list_by_espacio(espacio_id)
        return [self._map_to_read(d) for d in docs]

    async def list_by_bien(self, bien_id: uuid.UUID) -> list[DocumentoRead]:
        docs = await self.repo.list_by_bien(bien_id)
        return [self._map_to_read(d) for d in docs]

    async def get_by_id(self, documento_id: uuid.UUID) -> DocumentoRead:
        doc = await self.repo.get_with_details(documento_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Documento no encontrado",
            )
        return self._map_to_read(doc)

    async def create(
        self,
        data: DocumentoCreate,
        file_name: str | None = None,
        file_content: bytes | None = None,
        mime_type: str | None = None,
    ) -> DocumentoRead:
        # Validar entidades referenciadas si están presentes
        if data.sede_id:
            sede = await self.sede_repo.get(data.sede_id)
            if not sede:
                raise HTTPException(status_code=404, detail="Sede referenciada no existe")
        if data.edificio_id:
            edificio = await self.edificio_repo.get(data.edificio_id)
            if not edificio:
                raise HTTPException(status_code=404, detail="Edificio referenciado no existe")
        if data.piso_id:
            piso = await self.piso_repo.get(data.piso_id)
            if not piso:
                raise HTTPException(status_code=404, detail="Piso referenciado no existe")
        if data.espacio_id:
            espacio = await self.espacio_repo.get(data.espacio_id)
            if not espacio:
                raise HTTPException(status_code=404, detail="Espacio referenciado no existe")
        if data.bien_id:
            bien = await self.bien_repo.get(data.bien_id)
            if not bien:
                raise HTTPException(status_code=404, detail="Bien referenciado no existe")

        archivo_path = None
        archivo_nombre = None
        archivo_peso_bytes = None
        archivo_mime_type = None

        if file_name and file_content:
            (
                archivo_path,
                archivo_nombre,
                archivo_peso_bytes,
                archivo_mime_type,
            ) = self._save_file_to_disk(file_name, file_content, mime_type)

        doc = Documento(
            nombre=data.nombre.strip(),
            tipo_documento=data.tipo_documento,
            descripcion=data.descripcion.strip() if data.descripcion else None,
            fecha_emision=data.fecha_emision,
            fecha_vencimiento=data.fecha_vencimiento,
            emisor_entidad=data.emisor_entidad.strip() if data.emisor_entidad else None,
            numero_folio=data.numero_folio.strip() if data.numero_folio else None,
            sede_id=data.sede_id,
            edificio_id=data.edificio_id,
            piso_id=data.piso_id,
            espacio_id=data.espacio_id,
            bien_id=data.bien_id,
            metadata_extra=data.metadata_extra,
            archivo_path=archivo_path,
            archivo_nombre=archivo_nombre,
            archivo_peso_bytes=archivo_peso_bytes,
            archivo_mime_type=archivo_mime_type,
        )
        doc = await self.repo.create(doc)
        return await self.get_by_id(doc.id)

    async def update(self, documento_id: uuid.UUID, data: DocumentoUpdate) -> DocumentoRead:
        doc = await self.repo.get(documento_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Documento no encontrado",
            )

        update_dict = data.model_dump(exclude_unset=True)
        doc = await self.repo.update(doc, update_dict)
        return await self.get_by_id(doc.id)

    async def upload_file(
        self,
        documento_id: uuid.UUID,
        file_name: str,
        file_content: bytes,
        mime_type: str | None = None,
    ) -> DocumentoRead:
        doc = await self.repo.get(documento_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Documento no encontrado",
            )

        # Si ya tenía archivo, intentar borrar el archivo viejo
        if doc.archivo_path and os.path.exists(doc.archivo_path):
            try:
                os.remove(doc.archivo_path)
            except OSError:
                pass

        (
            archivo_path,
            archivo_nombre,
            archivo_peso_bytes,
            archivo_mime_type,
        ) = self._save_file_to_disk(file_name, file_content, mime_type)

        doc = await self.repo.update(
            doc,
            {
                "archivo_path": archivo_path,
                "archivo_nombre": archivo_nombre,
                "archivo_peso_bytes": archivo_peso_bytes,
                "archivo_mime_type": archivo_mime_type,
            },
        )
        return await self.get_by_id(doc.id)

    async def get_file_for_download(self, documento_id: uuid.UUID) -> tuple[str, str, str]:
        doc = await self.repo.get(documento_id)
        if not doc or not doc.archivo_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El documento no posee un archivo adjunto",
            )
        if not os.path.exists(doc.archivo_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El archivo físico no se encuentra en el servidor",
            )
        return (
            doc.archivo_path,
            doc.archivo_nombre or "documento.pdf",
            doc.archivo_mime_type or "application/octet-stream",
        )

    async def delete(self, documento_id: uuid.UUID) -> None:
        doc = await self.repo.get(documento_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Documento no encontrado",
            )
        # Soft delete
        await self.repo.soft_delete(doc)

    async def get_compliance_summary(self) -> ComplianceAlertSummary:
        docs = await self.repo.get_all_active_for_compliance()

        total = len(docs)
        vigentes = 0
        por_vencer_60 = 0
        por_vencer_30 = 0
        vencidos = 0
        sin_vencimiento = 0
        por_tipo: dict[str, int] = {}
        criticos: list[DocumentoRead] = []

        for d in docs:
            st, _ = self._compute_expiration(d)
            tipo = d.tipo_documento or "OTRO"
            por_tipo[tipo] = por_tipo.get(tipo, 0) + 1

            if st == "VIGENTE":
                vigentes += 1
            elif st == "POR_VENCER_60":
                por_vencer_60 += 1
            elif st == "POR_VENCER_30":
                por_vencer_30 += 1
                criticos.append(self._map_to_read(d))
            elif st == "VENCIDO":
                vencidos += 1
                criticos.append(self._map_to_read(d))
            elif st == "SIN_VENCIMIENTO":
                sin_vencimiento += 1

        return ComplianceAlertSummary(
            total_documentos=total,
            vigentes=vigentes,
            por_vencer_60=por_vencer_60,
            por_vencer_30=por_vencer_30,
            vencidos=vencidos,
            sin_vencimiento=sin_vencimiento,
            por_tipo=por_tipo,
            documentos_criticos=criticos[:20],
        )
