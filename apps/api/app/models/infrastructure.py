"""
Modelos de infraestructura universitaria.
Sede → Edificio → Piso → PlanoItem (entidades parseadas del DXF).
"""
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Sede(Base, TimestampMixin):
    __tablename__ = "sedes"

    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    direccion: Mapped[str | None] = mapped_column(String(500), nullable=True)

    edificios: Mapped[list["Edificio"]] = relationship(
        "Edificio", back_populates="sede", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Sede id={self.id} nombre={self.nombre!r}>"


class Edificio(Base, TimestampMixin):
    __tablename__ = "edificios"

    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    sede_id: Mapped[int] = mapped_column(ForeignKey("sedes.id"), nullable=False)

    sede: Mapped["Sede"] = relationship("Sede", back_populates="edificios")
    pisos: Mapped[list["Piso"]] = relationship(
        "Piso", back_populates="edificio", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Edificio id={self.id} nombre={self.nombre!r}>"


class Piso(Base, TimestampMixin):
    __tablename__ = "pisos"

    numero: Mapped[int] = mapped_column(Integer, nullable=False)
    nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    edificio_id: Mapped[int] = mapped_column(ForeignKey("edificios.id"), nullable=False)
    # Nombre original del archivo DXF
    archivo_dxf: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Datos SVG generados del DXF (almacenado como texto)
    svg_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Bounds del plano para la vista
    min_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    min_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_y: Mapped[float | None] = mapped_column(Float, nullable=True)

    edificio: Mapped["Edificio"] = relationship("Edificio", back_populates="pisos")
    items: Mapped[list["PlanoItem"]] = relationship(
        "PlanoItem", back_populates="piso", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Piso id={self.id} numero={self.numero}>"


class PlanoItem(Base, TimestampMixin):
    __tablename__ = "plano_items"

    piso_id: Mapped[int] = mapped_column(ForeignKey("pisos.id"), nullable=False)
    # Tipo de entidad DXF (ROOM, OFFICE, TEXT, etc.)
    tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    # Nombre / etiqueta (texto DXF o nombre de capa)
    nombre: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Capa DXF de origen
    capa: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Coordenadas del bounding box del item
    x: Mapped[float | None] = mapped_column(Float, nullable=True)
    y: Mapped[float | None] = mapped_column(Float, nullable=True)
    ancho: Mapped[float | None] = mapped_column(Float, nullable=True)
    alto: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Información adicional en formato JSON (como Text)
    metadata_extra: Mapped[str | None] = mapped_column(Text, nullable=True)

    piso: Mapped["Piso"] = relationship("Piso", back_populates="items")

    def __repr__(self) -> str:
        return f"<PlanoItem id={self.id} tipo={self.tipo!r} nombre={self.nombre!r}>"
