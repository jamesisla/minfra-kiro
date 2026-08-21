"""
Modelos de infraestructura universitaria.
Sede → Edificio → Piso → Espacio (Entidad persistente de negocio)
                      → PlanoItem (Geometría parseada del DXF / SVG)
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import UnidadOrganizacional
    from app.models.person import Persona


class Sede(Base, TimestampMixin):
    __tablename__ = "sedes"

    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    direccion: Mapped[str | None] = mapped_column(String(500), nullable=True)

    edificios: Mapped[list["Edificio"]] = relationship(
        "Edificio", back_populates="sede", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Sede id={self.id} nombre={self.nombre!r}>"


class Edificio(Base, TimestampMixin):
    __tablename__ = "edificios"

    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    sede_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sedes.id", ondelete="CASCADE"), nullable=False
    )

    sede: Mapped["Sede"] = relationship("Sede", back_populates="edificios")
    pisos: Mapped[list["Piso"]] = relationship(
        "Piso", back_populates="edificio", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Edificio id={self.id} nombre={self.nombre!r}>"


class Piso(Base, TimestampMixin):
    __tablename__ = "pisos"

    numero: Mapped[int] = mapped_column(Integer, nullable=False)
    nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    edificio_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("edificios.id", ondelete="CASCADE"), nullable=False
    )
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
        "PlanoItem", back_populates="piso", lazy="selectin", cascade="all, delete-orphan"
    )
    espacios: Mapped[list["Espacio"]] = relationship(
        "Espacio", back_populates="piso", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Piso id={self.id} numero={self.numero}>"


class Espacio(Base, TimestampMixin):
    """
    Entidad persistente de negocio para recintos (Salas, Oficinas, Laboratorios, etc.).
    Desacoplada del ciclo de vida del archivo DXF para conservar personas, bienes y documentos.
    """
    __tablename__ = "espacios"

    piso_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pisos.id", ondelete="CASCADE"), nullable=False
    )
    codigo: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tipo: Mapped[str] = mapped_column(String(100), default="SALA")
    estado: Mapped[str] = mapped_column(String(50), default="Disponible")  # Disponible, Ocupado, Mantenimiento, Reservado
    capacidad: Mapped[int] = mapped_column(Integer, default=0)
    area_m2: Mapped[float | None] = mapped_column(Float, nullable=True)
    perimetro_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    unidad_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("unidades_organizacionales.id", ondelete="SET NULL"), nullable=True
    )
    metadata_extra: Mapped[str | None] = mapped_column(Text, nullable=True)

    piso: Mapped["Piso"] = relationship("Piso", back_populates="espacios")
    unidad: Mapped["UnidadOrganizacional | None"] = relationship(
        "UnidadOrganizacional", back_populates="espacios", lazy="selectin"
    )
    plano_items: Mapped[list["PlanoItem"]] = relationship(
        "PlanoItem", back_populates="espacio", lazy="selectin"
    )
    asignaciones_personas: Mapped[list["EspacioPersona"]] = relationship(
        "EspacioPersona",
        back_populates="espacio",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Espacio id={self.id} codigo={self.codigo!r} nombre={self.nombre!r}>"


class EspacioPersona(Base, TimestampMixin):
    """
    Asociación entre un Espacio y una Persona (Ocupante, Responsable, Custodio, Brigadista).
    """
    __tablename__ = "espacio_personas"

    espacio_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("espacios.id", ondelete="CASCADE"), nullable=False
    )
    persona_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("personas.id", ondelete="CASCADE"), nullable=False
    )
    rol: Mapped[str] = mapped_column(
        String(50), default="OCUPANTE"
    )  # RESPONSABLE, OCUPANTE, BRIGADISTA, CONTACTO
    puesto_identificador: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fecha_inicio: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fecha_fin: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    espacio: Mapped["Espacio"] = relationship(
        "Espacio", back_populates="asignaciones_personas"
    )
    persona: Mapped["Persona"] = relationship(
        "Persona", back_populates="asignaciones_espacio", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<EspacioPersona espacio_id={self.espacio_id} persona_id={self.persona_id} rol={self.rol!r}>"


class PlanoItem(Base, TimestampMixin):
    """
    Representación geométrica vectorial de una entidad extraída de un archivo DXF / SVG.
    """
    __tablename__ = "plano_items"

    piso_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pisos.id", ondelete="CASCADE"), nullable=False
    )
    # Vínculo opcional a la entidad de negocio persistente
    espacio_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("espacios.id", ondelete="SET NULL"), nullable=True
    )
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
    espacio: Mapped["Espacio | None"] = relationship(
        "Espacio", back_populates="plano_items", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<PlanoItem id={self.id} tipo={self.tipo!r} nombre={self.nombre!r}>"
