#!/bin/bash
# Genera tests pytest para un archivo dado, usando un modelo IA local/gratuito.
#
# Uso: bash scripts/ai-tasks/generate-tests.sh apps/api/app/services/user_service.py

FILE="${1:?Uso: generate-tests.sh ruta/al/archivo.py}"

if [ ! -f "$FILE" ]; then
  echo "❌ Archivo no encontrado: $FILE"
  exit 1
fi

CODE=$(cat "$FILE")
PROMPT_TEMPLATE=$(cat .claude/prompts/test-gen.md)

curl -s http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${LITELLM_MASTER_KEY:-sk-local-dev}" \
  -d "$(jq -n \
    --arg prompt "$PROMPT_TEMPLATE" \
    --arg code "$CODE" \
    '{
      model: "local-coder",
      messages: [
        {role: "system", content: "Eres un experto en pytest y pytest-asyncio."},
        {role: "user", content: ($prompt + "\n\n" + $code)}
      ],
      max_tokens: 4000
    }')" | jq -r '.choices[0].message.content'
