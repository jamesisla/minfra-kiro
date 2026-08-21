"""
Modelo de Unidades Organizacionales (Facultades, Departamentos, Escuelas, Direcciones).
Permite estructurar el organigrama y asignar recintos y personal a unidades.
"""
import uuid
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.person import Persona
    from app.models.infrastructure import Espacio


class UnidadOrganizacional(Base, TimestampMixin):
    __tablename__ = "unidades_organizacionales"

    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    tipo: Mapped[str] = mapped_column(
        String(100), default="DEPARTAMENTO"
    )  # FACULTAD, DEPARTAMENTO, ESCUELA, DIRECCION, ADMINISTRATIVA, etc.
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("unidades_organizacionales.id", ondelete="SET NULL"), nullable=True
    )

    parent: Mapped["UnidadOrganizacional | None"] = relationship(
        "UnidadOrganizacional",
        remote_side="UnidadOrganizacional.id",
        back_populates="subunidades",
        lazy="selectin",
    )
    subunidades: Mapped[list["UnidadOrganizacional"]] = relationship(
        "UnidadOrganizacional",
        back_populates="parent",
        lazy="selectin",
    )
    personas: Mapped[list["Persona"]] = relationship(
        "Persona",
        back_populates="unidad",
        lazy="selectin",
    )
    espacios: Mapped[list["Espacio"]] = relationship(
        "Espacio",
        back_populates="unidad",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<UnidadOrganizacional id={self.id} nombre={self.nombre!r} tipo={self.tipo!r}>"
