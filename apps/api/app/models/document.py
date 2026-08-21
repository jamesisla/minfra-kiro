"""
Modelos de Documentos y Cumplimiento Normativo / Compliance (Fase 3).
Permite asociar títulos de dominio, certificados SEC, pólizas, protocolos de bioseguridad,
manuales y planos técnicos a Sedes, Edificios, Pisos, Recintos (Espacios) o Bienes.
"""
import uuid
from datetime import date
from typing import TYPE_CHECKING
from sqlalchemy import BigInteger, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.asset import Bien
    from app.models.infrastructure import Edificio, Espacio, Piso, Sede


class Documento(Base, TimestampMixin):
    """
    Entidad de Documento / Certificado institucional y técnico.
    Asociación polimórfica/multinivel a la infraestructura o activos.
    """
    __tablename__ = "documentos"

    nombre: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    tipo_documento: Mapped[str] = mapped_column(
        String(100), default="OTRO", index=True
    )  # CERTIFICADO_SEC, PERMISO_EDIFICACION, TITULO_DOMINIO, POLIZA_SEGURO, PROTOCOLO_BIOSEGURIDAD, MANUAL_GARANTIA, PLANO_TECNICO, INFORME_TECNICO, OTRO
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Datos físicos del archivo almacenado
    archivo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    archivo_nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    archivo_peso_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    archivo_mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Fechas y vigencia para control de vencimiento y semáforos
    fecha_emision: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    emisor_entidad: Mapped[str | None] = mapped_column(String(255), nullable=True)
    numero_folio: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    # Claves Foráneas polimórficas a entidades de infraestructura o bienes
    sede_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("sedes.id", ondelete="CASCADE"), nullable=True, index=True
    )
    edificio_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("edificios.id", ondelete="CASCADE"), nullable=True, index=True
    )
    piso_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pisos.id", ondelete="CASCADE"), nullable=True, index=True
    )
    espacio_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("espacios.id", ondelete="CASCADE"), nullable=True, index=True
    )
    bien_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("bienes.id", ondelete="CASCADE"), nullable=True, index=True
    )

    metadata_extra: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relaciones ORM
    sede: Mapped["Sede | None"] = relationship("Sede", lazy="selectin")
    edificio: Mapped["Edificio | None"] = relationship("Edificio", lazy="selectin")
    piso: Mapped["Piso | None"] = relationship("Piso", lazy="selectin")
    espacio: Mapped["Espacio | None"] = relationship("Espacio", lazy="selectin")
    bien: Mapped["Bien | None"] = relationship("Bien", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Documento id={self.id} nombre={self.nombre!r} tipo={self.tipo_documento!r}>"
