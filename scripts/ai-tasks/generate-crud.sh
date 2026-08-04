#!/bin/bash
# Genera el scaffolding de un CRUD completo usando un modelo IA
# local/gratuito vía LiteLLM.
#
# Uso: bash scripts/ai-tasks/generate-crud.sh Course "name:str, credits:int, active:bool"

ENTITY="${1:?Uso: generate-crud.sh NombreEntidad \"campo:tipo, ...\"}"
FIELDS="${2:-name:str}"
ENTITY_LOWER=$(echo "$ENTITY" | tr '[:upper:]' '[:lower:]')

PROMPT="Genera el código completo para una nueva entidad '$ENTITY' en un
proyecto FastAPI con arquitectura por capas (router -> service -> repository -> model).

Campos adicionales (además de id, created_at, updated_at, deleted_at
que ya provee TimestampMixin): $FIELDS

Sigue EXACTAMENTE los patrones de app/models/user.py, app/schemas/user.py,
app/repositories/user.py, app/services/user_service.py y
app/api/v1/routes/users.py como referencia de estilo.

Entrega 5 bloques de código, cada uno con un comentario indicando
la ruta del archivo:
1. app/models/${ENTITY_LOWER}.py
2. app/schemas/${ENTITY_LOWER}.py
3. app/repositories/${ENTITY_LOWER}.py
4. app/services/${ENTITY_LOWER}_service.py
5. app/api/v1/routes/${ENTITY_LOWER}s.py

No incluyas explicaciones, solo el código de cada archivo."

curl -s http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY:-sk-local-dev}" \
  -d "$(jq -n --arg prompt "$PROMPT" '{
    model: "local-coder",
    messages: [
      {role: "system", content: "Eres un experto en FastAPI, SQLAlchemy 2.0 async y Pydantic v2. Generas código limpio, typed y consistente con el estilo del proyecto."},
      {role: "user", content: $prompt}
    ],
    max_tokens: 4000
  }')" | jq -r '.choices[0].message.content'

echo ""
echo "💡 Revisa el código generado y guárdalo en las rutas indicadas."
echo "   No olvides: alembic revision --autogenerate -m \"crear_tabla_${ENTITY_LOWER}s\""
