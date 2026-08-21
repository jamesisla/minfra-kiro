"""
Modelo de Personas (Docentes, Administrativos, Estudiantes, Personal Externo).
Permite asignar responsables, ocupantes y custodios a los espacios e inventarios.
"""
import uuid
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import UnidadOrganizacional
    from app.models.user import User
    from app.models.infrastructure import EspacioPersona
    from app.models.asset import Bien


class Persona(Base, TimestampMixin):
    __tablename__ = "personas"

    nombre_completo: Mapped[str] = mapped_column(String(255), nullable=False)
    rut_dni: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    telefono: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cargo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tipo: Mapped[str] = mapped_column(
        String(50), default="DOCENTE"
    )  # DOCENTE, ADMINISTRATIVO, ESTUDIANTE, EXTERNO, INVESTIGADOR
    unidad_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("unidades_organizacionales.id", ondelete="SET NULL"), nullable=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    metadata_extra: Mapped[str | None] = mapped_column(Text, nullable=True)

    unidad: Mapped["UnidadOrganizacional | None"] = relationship(
        "UnidadOrganizacional", back_populates="personas", lazy="selectin"
    )
    user: Mapped["User | None"] = relationship("User", lazy="selectin")
    asignaciones_espacio: Mapped[list["EspacioPersona"]] = relationship(
        "EspacioPersona",
        back_populates="persona",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
    bienes_custodiados: Mapped[list["Bien"]] = relationship(
        "Bien",
        back_populates="custodio",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Persona id={self.id} nombre={self.nombre_completo!r} cargo={self.cargo!r}>"
