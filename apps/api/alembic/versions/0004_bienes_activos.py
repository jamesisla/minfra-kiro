"""Crea tablas para Fase 2: bienes (activos fijos) y bien_movimientos (trazabilidad)

Revision ID: 0004_bienes_activos
Revises: 0003_espacios_personas
Create Date: 2026-08-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "0004_bienes_activos"
down_revision: Union[str, None] = "0003_espacios_personas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. bienes (Activos Fijos e Inventario) ──
    op.create_table(
        "bienes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("codigo_patrimonial", sa.String(100), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("categoria", sa.String(100), nullable=False, server_default="MOBILIARIO"),
        sa.Column("marca", sa.String(100), nullable=True),
        sa.Column("modelo", sa.String(100), nullable=True),
        sa.Column("numero_serie", sa.String(100), nullable=True),
        sa.Column("estado_operativo", sa.String(50), nullable=False, server_default="OPERATIVO"),
        sa.Column("valor_compra", sa.Float(), nullable=True),
        sa.Column("fecha_adquisicion", sa.Date(), nullable=True),
        sa.Column("fecha_garantia", sa.Date(), nullable=True),
        sa.Column("espacio_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("custodio_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("pos_x", sa.Float(), nullable=True),
        sa.Column("pos_y", sa.Float(), nullable=True),
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
            ["espacio_id"],
            ["espacios.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["custodio_id"],
            ["personas.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo_patrimonial"),
    )
    op.create_index("ix_bienes_codigo_patrimonial", "bienes", ["codigo_patrimonial"])
    op.create_index("ix_bienes_categoria", "bienes", ["categoria"])
    op.create_index("ix_bienes_estado_operativo", "bienes", ["estado_operativo"])
    op.create_index("ix_bienes_numero_serie", "bienes", ["numero_serie"])
    op.create_index("ix_bienes_espacio_id", "bienes", ["espacio_id"])
    op.create_index("ix_bienes_custodio_id", "bienes", ["custodio_id"])

    # ── 2. bien_movimientos (Trazabilidad y Auditoría) ──
    op.create_table(
        "bien_movimientos",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bien_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("espacio_origen_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("espacio_destino_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("persona_responsable_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "fecha_traslado",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("motivo", sa.Text(), nullable=True),
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
            ["bien_id"],
            ["bienes.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["espacio_origen_id"],
            ["espacios.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["espacio_destino_id"],
            ["espacios.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["persona_responsable_id"],
            ["personas.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_bien_movimientos_bien_id", "bien_movimientos", ["bien_id"])
    op.create_index(
        "ix_bien_movimientos_espacio_origen_id",
        "bien_movimientos",
        ["espacio_origen_id"],
    )
    op.create_index(
        "ix_bien_movimientos_espacio_destino_id",
        "bien_movimientos",
        ["espacio_destino_id"],
    )


def downgrade() -> None:
    op.drop_table("bien_movimientos")
    op.drop_table("bienes")
