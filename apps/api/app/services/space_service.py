"""
Servicio para gestión de Espacios Físicos y Asignaciones Espacio-Persona.
"""
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.infrastructure import Espacio, EspacioPersona
from app.repositories.infrastructure import PisoRepository
from app.repositories.person import PersonaRepository
from app.repositories.space import EspacioPersonaRepository, EspacioRepository
from app.schemas.person import PersonaRead
from app.schemas.space import (
    EspacioCreate,
    EspacioPersonaCreate,
    EspacioPersonaRead,
    EspacioPersonaUpdate,
    EspacioRead,
    EspacioUpdate,
    EspacioWithDetailsRead,
)


class SpaceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = EspacioRepository(db)
        self.piso_repo = PisoRepository(db)
        self.persona_repo = PersonaRepository(db)
        self.asignacion_repo = EspacioPersonaRepository(db)

    async def list_by_piso(self, piso_id: uuid.UUID) -> list[EspacioRead]:
        espacios = await self.repo.list_by_piso(piso_id)
        return [EspacioRead.model_validate(e) for e in espacios]

    async def get_by_id(self, espacio_id: uuid.UUID) -> EspacioWithDetailsRead:
        espacio = await self.repo.get_with_details(espacio_id)
        if not espacio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Espacio físico no encontrado",
            )
        res = EspacioWithDetailsRead.model_validate(espacio)
        if espacio.unidad:
            res.unidad_nombre = espacio.unidad.nombre
            res.unidad_codigo = espacio.unidad.codigo
        if espacio.piso:
            res.piso_numero = espacio.piso.numero
            if espacio.piso.edificio:
                res.edificio_nombre = espacio.piso.edificio.nombre
                if espacio.piso.edificio.sede:
                    res.sede_nombre = espacio.piso.edificio.sede.nombre

        res.personas_asignadas = [
            EspacioPersonaRead(
                id=asig.id,
                espacio_id=asig.espacio_id,
                persona_id=asig.persona_id,
                rol=asig.rol,
                puesto_identificador=asig.puesto_identificador,
                fecha_inicio=asig.fecha_inicio,
                fecha_fin=asig.fecha_fin,
                notas=asig.notas,
                persona=PersonaRead.model_validate(asig.persona) if asig.persona else None,
                created_at=asig.created_at,
                updated_at=asig.updated_at,
            )
            for asig in espacio.asignaciones_personas
            if asig.deleted_at is None
        ]
        return res

    async def create(self, data: EspacioCreate) -> EspacioRead:
        piso = await self.piso_repo.get(data.piso_id)
        if not piso:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Piso especificado no existe",
            )
        espacio = Espacio(
            piso_id=data.piso_id,
            codigo=data.codigo.strip(),
            nombre=data.nombre.strip() if data.nombre else None,
            tipo=data.tipo,
            estado=data.estado,
            capacidad=data.capacidad,
            area_m2=data.area_m2,
            perimetro_m=data.perimetro_m,
            unidad_id=data.unidad_id,
            metadata_extra=data.metadata_extra,
        )
        espacio = await self.repo.create(espacio)
        return EspacioRead.model_validate(espacio)

    async def update(self, espacio_id: uuid.UUID, data: EspacioUpdate) -> EspacioRead:
        espacio = await self.repo.get(espacio_id)
        if not espacio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Espacio físico no encontrado",
            )
        update_dict = data.model_dump(exclude_unset=True)
        espacio = await self.repo.update(espacio, update_dict)
        return EspacioRead.model_validate(espacio)

    async def delete(self, espacio_id: uuid.UUID) -> None:
        espacio = await self.repo.get(espacio_id)
        if not espacio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Espacio físico no encontrado",
            )
        await self.repo.soft_delete(espacio)

    # ── Asignaciones de Personas al Espacio ───────────────────────────────

    async def list_personas(self, espacio_id: uuid.UUID) -> list[EspacioPersonaRead]:
        asigs = await self.asignacion_repo.list_by_espacio(espacio_id)
        return [
            EspacioPersonaRead(
                id=a.id,
                espacio_id=a.espacio_id,
                persona_id=a.persona_id,
                rol=a.rol,
                puesto_identificador=a.puesto_identificador,
                fecha_inicio=a.fecha_inicio,
                fecha_fin=a.fecha_fin,
                notas=a.notas,
                persona=PersonaRead.model_validate(a.persona) if a.persona else None,
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
            for a in asigs
        ]

    async def assign_persona(
        self, espacio_id: uuid.UUID, data: EspacioPersonaCreate
    ) -> EspacioPersonaRead:
        espacio = await self.repo.get(espacio_id)
        if not espacio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Espacio no encontrado",
            )
        persona = await self.persona_repo.get(data.persona_id)
        if not persona:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persona no encontrada",
            )

        asig = EspacioPersona(
            espacio_id=espacio_id,
            persona_id=data.persona_id,
            rol=data.rol,
            puesto_identificador=data.puesto_identificador,
            fecha_inicio=data.fecha_inicio,
            fecha_fin=data.fecha_fin,
            notas=data.notas,
        )
        asig = await self.asignacion_repo.create(asig)
        asig_saved = await self.asignacion_repo.get(asig.id)
        return EspacioPersonaRead(
            id=asig_saved.id,
            espacio_id=asig_saved.espacio_id,
            persona_id=asig_saved.persona_id,
            rol=asig_saved.rol,
            puesto_identificador=asig_saved.puesto_identificador,
            fecha_inicio=asig_saved.fecha_inicio,
            fecha_fin=asig_saved.fecha_fin,
            notas=asig_saved.notas,
            persona=PersonaRead.model_validate(persona),
            created_at=asig_saved.created_at,
            updated_at=asig_saved.updated_at,
        )

    async def update_persona_assignment(
        self, asignacion_id: uuid.UUID, data: EspacioPersonaUpdate
    ) -> EspacioPersonaRead:
        asig = await self.asignacion_repo.get(asignacion_id)
        if not asig:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asignación no encontrada",
            )
        update_dict = data.model_dump(exclude_unset=True)
        asig = await self.asignacion_repo.update(asig, update_dict)
        persona = await self.persona_repo.get(asig.persona_id)
        return EspacioPersonaRead(
            id=asig.id,
            espacio_id=asig.espacio_id,
            persona_id=asig.persona_id,
            rol=asig.rol,
            puesto_identificador=asig.puesto_identificador,
            fecha_inicio=asig.fecha_inicio,
            fecha_fin=asig.fecha_fin,
            notas=asig.notas,
            persona=PersonaRead.model_validate(persona) if persona else None,
            created_at=asig.created_at,
            updated_at=asig.updated_at,
        )

    async def remove_persona_assignment(self, asignacion_id: uuid.UUID) -> None:
        asig = await self.asignacion_repo.get(asignacion_id)
        if not asig:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asignación no encontrada",
            )
        await self.asignacion_repo.delete(asig)
