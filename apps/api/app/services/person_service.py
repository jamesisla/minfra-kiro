"""
Servicio para gestión de Personas (Docentes, Administrativos, Estudiantes, Personal Externo).
"""
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.person import Persona
from app.repositories.person import PersonaRepository
from app.repositories.organization import UnidadOrganizacionalRepository
from app.schemas.person import (
    PersonaCreate,
    PersonaRead,
    PersonaUpdate,
    PersonaWithUnidadRead,
)


class PersonService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = PersonaRepository(db)
        self.org_repo = UnidadOrganizacionalRepository(db)

    async def list(
        self, skip: int = 0, limit: int = 50, unidad_id: uuid.UUID | None = None
    ) -> list[PersonaWithUnidadRead]:
        personas = await self.repo.list_with_unidad(skip=skip, limit=limit, unidad_id=unidad_id)
        result = []
        for p in personas:
            p_dict = PersonaWithUnidadRead.model_validate(p)
            if p.unidad:
                p_dict.unidad_nombre = p.unidad.nombre
                p_dict.unidad_codigo = p.unidad.codigo
            result.append(p_dict)
        return result

    async def search(self, query: str, limit: int = 20) -> list[PersonaWithUnidadRead]:
        personas = await self.repo.search(query=query, limit=limit)
        result = []
        for p in personas:
            p_dict = PersonaWithUnidadRead.model_validate(p)
            if p.unidad:
                p_dict.unidad_nombre = p.unidad.nombre
                p_dict.unidad_codigo = p.unidad.codigo
            result.append(p_dict)
        return result

    async def get_by_id(self, persona_id: uuid.UUID) -> PersonaWithUnidadRead:
        p = await self.repo.get_with_asignaciones(persona_id)
        if not p:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persona no encontrada",
            )
        p_dict = PersonaWithUnidadRead.model_validate(p)
        if p.unidad:
            p_dict.unidad_nombre = p.unidad.nombre
            p_dict.unidad_codigo = p.unidad.codigo
        return p_dict

    async def create(self, data: PersonaCreate) -> PersonaWithUnidadRead:
        if data.unidad_id:
            unit = await self.org_repo.get(data.unidad_id)
            if not unit:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Unidad organizacional especificada no existe",
                )

        persona = Persona(
            nombre_completo=data.nombre_completo,
            rut_dni=data.rut_dni,
            email=data.email,
            telefono=data.telefono,
            cargo=data.cargo,
            tipo=data.tipo,
            unidad_id=data.unidad_id,
            user_id=data.user_id,
            metadata_extra=data.metadata_extra,
        )
        persona = await self.repo.create(persona)
        return await self.get_by_id(persona.id)

    async def update(self, persona_id: uuid.UUID, data: PersonaUpdate) -> PersonaWithUnidadRead:
        persona = await self.repo.get(persona_id)
        if not persona:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persona no encontrada",
            )
        update_dict = data.model_dump(exclude_unset=True)
        persona = await self.repo.update(persona, update_dict)
        return await self.get_by_id(persona.id)

    async def delete(self, persona_id: uuid.UUID) -> None:
        persona = await self.repo.get(persona_id)
        if not persona:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persona no encontrada",
            )
        await self.repo.soft_delete(persona)
