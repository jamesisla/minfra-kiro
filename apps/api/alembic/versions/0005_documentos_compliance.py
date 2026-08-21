"""Crea tabla para Fase 3: documentos (Cumplimiento Normativo, Certificados y Alertas de Vencimiento)

Revision ID: 0005_documentos_compliance
Revises: 0004_bienes_activos
Create Date: 2026-08-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "0005_documentos_compliance"
down_revision: Union[str, None] = "0004_bienes_activos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. documentos (Archivos y Certificados de Infraestructura / Bienes) ──
    op.create_table(
        "documentos",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("tipo_documento", sa.String(100), nullable=False, server_default="OTRO"),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("archivo_path", sa.String(500), nullable=True),
        sa.Column("archivo_nombre", sa.String(255), nullable=True),
        sa.Column("archivo_peso_bytes", sa.BigInteger(), nullable=True),
        sa.Column("archivo_mime_type", sa.String(100), nullable=True),
        sa.Column("fecha_emision", sa.Date(), nullable=True),
        sa.Column("fecha_vencimiento", sa.Date(), nullable=True),
        sa.Column("emisor_entidad", sa.String(255), nullable=True),
        sa.Column("numero_folio", sa.String(100), nullable=True),
        sa.Column("sede_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("edificio_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("piso_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("espacio_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("bien_id", postgresql.UUID(as_uuid=True), nullable=True),
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
            ["sede_id"],
            ["sedes.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["edificio_id"],
            ["edificios.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["piso_id"],
            ["pisos.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["espacio_id"],
            ["espacios.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["bien_id"],
            ["bienes.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documentos_nombre", "documentos", ["nombre"])
    op.create_index("ix_documentos_tipo_documento", "documentos", ["tipo_documento"])
    op.create_index("ix_documentos_fecha_vencimiento", "documentos", ["fecha_vencimiento"])
    op.create_index("ix_documentos_numero_folio", "documentos", ["numero_folio"])
    op.create_index("ix_documentos_sede_id", "documentos", ["sede_id"])
    op.create_index("ix_documentos_edificio_id", "documentos", ["edificio_id"])
    op.create_index("ix_documentos_piso_id", "documentos", ["piso_id"])
    op.create_index("ix_documentos_espacio_id", "documentos", ["espacio_id"])
    op.create_index("ix_documentos_bien_id", "documentos", ["bien_id"])


def downgrade() -> None:
    op.drop_table("documentos")
