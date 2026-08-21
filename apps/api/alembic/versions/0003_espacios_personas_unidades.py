"""Crea tablas para Fase 1: unidades_organizacionales, personas, espacios y espacio_personas

Revision ID: 0003_espacios_personas
Revises: 0002_infrastructure
Create Date: 2026-08-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "0003_espacios_personas"
down_revision: Union[str, None] = "0002_infrastructure"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. unidades_organizacionales ──
    op.create_table(
        "unidades_organizacionales",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("codigo", sa.String(50), nullable=True),
        sa.Column("tipo", sa.String(100), nullable=False, server_default="DEPARTAMENTO"),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["unidades_organizacionales.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_unidades_organizacionales_codigo",
        "unidades_organizacionales",
        ["codigo"],
    )

    # ── 2. personas ──
    op.create_table(
        "personas",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre_completo", sa.String(255), nullable=False),
        sa.Column("rut_dni", sa.String(50), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("telefono", sa.String(50), nullable=True),
        sa.Column("cargo", sa.String(255), nullable=True),
        sa.Column("tipo", sa.String(50), nullable=False, server_default="DOCENTE"),
        sa.Column("unidad_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("metadata_extra", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["unidad_id"],
            ["unidades_organizacionales.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_personas_rut_dni", "personas", ["rut_dni"])
    op.create_index("ix_personas_email", "personas", ["email"])
    op.create_index("ix_personas_unidad_id", "personas", ["unidad_id"])

    # ── 3. espacios ──
    op.create_table(
        "espacios",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("piso_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("codigo", sa.String(100), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=True),
        sa.Column("tipo", sa.String(100), nullable=False, server_default="SALA"),
        sa.Column("estado", sa.String(50), nullable=False, server_default="Disponible"),
        sa.Column("capacidad", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("area_m2", sa.Float(), nullable=True),
        sa.Column("perimetro_m", sa.Float(), nullable=True),
        sa.Column("unidad_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("metadata_extra", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["piso_id"], ["pisos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["unidad_id"],
            ["unidades_organizacionales.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_espacios_piso_id", "espacios", ["piso_id"])
    op.create_index("ix_espacios_codigo", "espacios", ["codigo"])
    op.create_index("ix_espacios_unidad_id", "espacios", ["unidad_id"])

    # ── 4. espacio_personas ──
    op.create_table(
        "espacio_personas",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("espacio_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("persona_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rol", sa.String(50), nullable=False, server_default="OCUPANTE"),
        sa.Column("puesto_identificador", sa.String(100), nullable=True),
        sa.Column("fecha_inicio", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fecha_fin", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["espacio_id"], ["espacios.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["persona_id"], ["personas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_espacio_personas_espacio_id", "espacio_personas", ["espacio_id"]
    )
    op.create_index(
        "ix_espacio_personas_persona_id", "espacio_personas", ["persona_id"]
    )

    # ── 5. Actualizar plano_items con espacio_id ──
    op.add_column(
        "plano_items",
        sa.Column("espacio_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_plano_items_espacio_id",
        "plano_items",
        "espacios",
        ["espacio_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_plano_items_espacio_id", "plano_items", ["espacio_id"])


def downgrade() -> None:
    op.drop_constraint("fk_plano_items_espacio_id", "plano_items", type_="foreignkey")
    op.drop_index("ix_plano_items_espacio_id", "plano_items")
    op.drop_column("plano_items", "espacio_id")

    op.drop_table("espacio_personas")
    op.drop_table("espacios")
    op.drop_table("personas")
    op.drop_table("unidades_organizacionales")
