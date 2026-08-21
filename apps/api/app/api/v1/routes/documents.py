"""
Endpoints para gestión de Documentos y Cumplimiento Normativo / Compliance (Fase 3).
"""
import uuid
from datetime import date
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from app.core.dependencies import CurrentUser, DbSession
from app.schemas.document import (
    ComplianceAlertSummary,
    DocumentoCreate,
    DocumentoRead,
    DocumentoUpdate,
)
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[DocumentoRead])
@router.get("/", response_model=list[DocumentoRead])
async def list_documents(
    db: DbSession,
    _: CurrentUser,
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
    """Lista documentos con filtros multinivel y estado de semáforo."""
    service = DocumentService(db)
    return await service.list_documents(
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


@router.get("/compliance/summary", response_model=ComplianceAlertSummary)
async def get_compliance_summary(
    db: DbSession,
    _: CurrentUser,
) -> ComplianceAlertSummary:
    """Retorna métricas consolidadas de compliance y alertas de vencimiento (vigentes, por vencer, vencidos)."""
    service = DocumentService(db)
    return await service.get_compliance_summary()


@router.get("/espacio/{espacio_id}", response_model=list[DocumentoRead])
async def list_documents_by_espacio(
    espacio_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> list[DocumentoRead]:
    """Retorna todos los documentos asociados directamente a un recinto/espacio."""
    service = DocumentService(db)
    return await service.list_by_espacio(espacio_id)


@router.get("/bien/{bien_id}", response_model=list[DocumentoRead])
async def list_documents_by_bien(
    bien_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> list[DocumentoRead]:
    """Retorna los manuales, garantías y certificados de un bien específico."""
    service = DocumentService(db)
    return await service.list_by_bien(bien_id)


@router.get("/{documento_id}", response_model=DocumentoRead)
async def get_document(
    documento_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> DocumentoRead:
    service = DocumentService(db)
    return await service.get_by_id(documento_id)


@router.post("", response_model=DocumentoRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DocumentoRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: DocumentoCreate,
    db: DbSession,
    _: CurrentUser,
) -> DocumentoRead:
    """Crea el registro de un documento vía JSON."""
    service = DocumentService(db)
    return await service.create(payload)


@router.post("/upload", response_model=DocumentoRead, status_code=status.HTTP_201_CREATED)
async def upload_and_create_document(
    db: DbSession,
    _: CurrentUser,
    file: UploadFile = File(...),
    nombre: str = Form(...),
    tipo_documento: str = Form("OTRO"),
    descripcion: str | None = Form(None),
    fecha_emision: str | None = Form(None),
    fecha_vencimiento: str | None = Form(None),
    emisor_entidad: str | None = Form(None),
    numero_folio: str | None = Form(None),
    sede_id: str | None = Form(None),
    edificio_id: str | None = Form(None),
    piso_id: str | None = Form(None),
    espacio_id: str | None = Form(None),
    bien_id: str | None = Form(None),
) -> DocumentoRead:
    """Sube un archivo físico (PDF, imagen) y crea el documento en un solo paso."""
    service = DocumentService(db)
    file_content = await file.read()

    emision_date = date.fromisoformat(fecha_emision) if fecha_emision else None
    vencimiento_date = date.fromisoformat(fecha_vencimiento) if fecha_vencimiento else None

    payload = DocumentoCreate(
        nombre=nombre,
        tipo_documento=tipo_documento,
        descripcion=descripcion,
        fecha_emision=emision_date,
        fecha_vencimiento=vencimiento_date,
        emisor_entidad=emisor_entidad,
        numero_folio=numero_folio,
        sede_id=uuid.UUID(sede_id) if sede_id else None,
        edificio_id=uuid.UUID(edificio_id) if edificio_id else None,
        piso_id=uuid.UUID(piso_id) if piso_id else None,
        espacio_id=uuid.UUID(espacio_id) if espacio_id else None,
        bien_id=uuid.UUID(bien_id) if bien_id else None,
    )

    return await service.create(
        data=payload,
        file_name=file.filename or "documento.pdf",
        file_content=file_content,
        mime_type=file.content_type,
    )


@router.post("/{documento_id}/upload-file", response_model=DocumentoRead)
async def upload_file_to_document(
    documento_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
    file: UploadFile = File(...),
) -> DocumentoRead:
    """Adjunta o reemplaza el archivo físico de un documento existente."""
    service = DocumentService(db)
    file_content = await file.read()
    return await service.upload_file(
        documento_id=documento_id,
        file_name=file.filename or "documento.pdf",
        file_content=file_content,
        mime_type=file.content_type,
    )


@router.get("/{documento_id}/file")
async def get_document_file(
    documento_id: uuid.UUID,
    db: DbSession,
) -> FileResponse:
    """Descarga o visualiza en el navegador el archivo físico adjunto."""
    service = DocumentService(db)
    file_path, filename, mime_type = await service.get_file_for_download(documento_id)
    return FileResponse(
        path=file_path,
        media_type=mime_type,
        filename=filename,
        content_disposition_type="inline" if mime_type == "application/pdf" else "attachment",
    )


@router.patch("/{documento_id}", response_model=DocumentoRead)
async def update_document(
    documento_id: uuid.UUID,
    payload: DocumentoUpdate,
    db: DbSession,
    _: CurrentUser,
) -> DocumentoRead:
    service = DocumentService(db)
    return await service.update(documento_id, payload)


@router.delete("/{documento_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    documento_id: uuid.UUID,
    db: DbSession,
    _: CurrentUser,
) -> dict[str, str]:
    service = DocumentService(db)
    await service.delete(documento_id)
    return {"message": "Documento eliminado exitosamente"}
