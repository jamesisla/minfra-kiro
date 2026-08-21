# Importar todos los modelos para que Alembic y SQLAlchemy los detecten automáticamente
from app.models.user import User  # noqa: F401
from app.models.organization import UnidadOrganizacional  # noqa: F401
from app.models.person import Persona  # noqa: F401
from app.models.infrastructure import (  # noqa: F401
    Sede,
    Edificio,
    Piso,
    Espacio,
    EspacioPersona,
    PlanoItem,
)
