"""Crea tablas de infraestructura universitaria: sedes, edificios, pisos, plano_items

Revision ID: 0002_infrastructure
Revises: 
Create Date: 2026-06-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "0002_infrastructure"
down_revision: Union[str, None] = "0001_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── sedes ──
    op.create_table(
        "sedes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("direccion", sa.String(500), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )

    # ── edificios ──
    op.create_table(
        "edificios",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("codigo", sa.String(50), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("sede_id", postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.ForeignKeyConstraint(["sede_id"], ["sedes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── pisos ──
    op.create_table(
        "pisos",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("numero", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=True),
        sa.Column("edificio_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("archivo_dxf", sa.String(500), nullable=True),
        sa.Column("svg_data", sa.Text(), nullable=True),
        sa.Column("min_x", sa.Float(), nullable=True),
        sa.Column("min_y", sa.Float(), nullable=True),
        sa.Column("max_x", sa.Float(), nullable=True),
        sa.Column("max_y", sa.Float(), nullable=True),
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
        sa.ForeignKeyConstraint(["edificio_id"], ["edificios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── plano_items ──
    op.create_table(
        "plano_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("piso_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tipo", sa.String(100), nullable=False),
        sa.Column("nombre", sa.String(500), nullable=True),
        sa.Column("capa", sa.String(255), nullable=True),
        sa.Column("x", sa.Float(), nullable=True),
        sa.Column("y", sa.Float(), nullable=True),
        sa.Column("ancho", sa.Float(), nullable=True),
        sa.Column("alto", sa.Float(), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )

    # Índice para buscar items por piso
    op.create_index("ix_plano_items_piso_id", "plano_items", ["piso_id"])
    op.create_index("ix_edificios_sede_id", "edificios", ["sede_id"])
    op.create_index("ix_pisos_edificio_id", "pisos", ["edificio_id"])


def downgrade() -> None:
    op.drop_table("plano_items")
    op.drop_table("pisos")
    op.drop_table("edificios")
    op.drop_table("sedes")
