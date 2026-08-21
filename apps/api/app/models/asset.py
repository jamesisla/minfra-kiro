"""
Modelos de Bienes / Activos Fijos e Inventario Físico (Fase 2).
Permite gestionar equipamiento, mobiliario, tecnología y climatización
geolocalizados en los recintos con trazabilidad y códigos QR.
"""
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING
from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.infrastructure import Espacio
    from app.models.person import Persona


class Bien(Base, TimestampMixin):
    """
    Entidad de Bien / Activo Fijo inventariado en un recinto.
    """
    __tablename__ = "bienes"

    codigo_patrimonial: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    categoria: Mapped[str] = mapped_column(
        String(100), default="MOBILIARIO", index=True
    )  # MOBILIARIO, TI_COMPUTO, CLIMATIZACION, LABORATORIO, AUDIOVISUAL, SEGURIDAD, OTRO
    marca: Mapped[str | None] = mapped_column(String(100), nullable=True)
    modelo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    numero_serie: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    estado_operativo: Mapped[str] = mapped_column(
        String(50), default="OPERATIVO", index=True
    )  # OPERATIVO, EN_MANTENCION, EN_REPARACION, DE_BAJA, EN_BODEGA
    valor_compra: Mapped[float | None] = mapped_column(Float, nullable=True)
    fecha_adquisicion: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_garantia: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Ubicación física en el recinto
    espacio_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("espacios.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Custodio responsable de la tenencia del bien
    custodio_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("personas.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Coordenadas relativas en el plano CAD para ubicar pines en el visor SVG
    pos_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    pos_y: Mapped[float | None] = mapped_column(Float, nullable=True)

    metadata_extra: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relaciones
    espacio: Mapped["Espacio | None"] = relationship(
        "Espacio", back_populates="bienes", lazy="selectin"
    )
    custodio: Mapped["Persona | None"] = relationship(
        "Persona", back_populates="bienes_custodiados", lazy="selectin"
    )
    movimientos: Mapped[list["BienMovimiento"]] = relationship(
        "BienMovimiento",
        back_populates="bien",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="BienMovimiento.fecha_traslado.desc()",
    )

    def __repr__(self) -> str:
        return f"<Bien id={self.id} codigo={self.codigo_patrimonial!r} nombre={self.nombre!r}>"


class BienMovimiento(Base, TimestampMixin):
    """
    Registro de auditoría y trazabilidad de traslados de bienes entre recintos.
    """
    __tablename__ = "bien_movimientos"

    bien_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bienes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    espacio_origen_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("espacios.id", ondelete="SET NULL"), nullable=True, index=True
    )
    espacio_destino_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("espacios.id", ondelete="SET NULL"), nullable=True, index=True
    )
    persona_responsable_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("personas.id", ondelete="SET NULL"), nullable=True, index=True
    )
    fecha_traslado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    motivo: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relaciones
    bien: Mapped["Bien"] = relationship("Bien", back_populates="movimientos")
    espacio_origen: Mapped["Espacio | None"] = relationship(
        "Espacio", foreign_keys=[espacio_origen_id], lazy="selectin"
    )
    espacio_destino: Mapped["Espacio | None"] = relationship(
        "Espacio", foreign_keys=[espacio_destino_id], lazy="selectin"
    )
    persona_responsable: Mapped["Persona | None"] = relationship(
        "Persona", foreign_keys=[persona_responsable_id], lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<BienMovimiento bien_id={self.bien_id} fecha={self.fecha_traslado}>"
