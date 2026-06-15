# Importar todos los modelos para que Alembic los detecte automáticamente
from app.models.user import User  # noqa: F401
from app.models.infrastructure import Sede, Edificio, Piso, PlanoItem  # noqa: F401
