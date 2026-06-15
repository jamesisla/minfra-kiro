/**
 * Cliente para el proxy LiteLLM local — permite llamar a CUALQUIER
 * modelo (local, gratuito o de pago) con la misma interfaz OpenAI.
 *
 * Esto se usa para features de la APP que requieren IA (ej. un
 * asistente para alumnos), NO para el desarrollo asistido por IA
 * en el IDE (eso se configura directamente en Cursor).
 *
 * IMPORTANTE: este cliente debe usarse SOLO desde Server Components,
 * Server Actions o Route Handlers — nunca expongas LITELLM_PROXY_URL
 * con NEXT_PUBLIC_ ni llames esto desde el cliente.
 */

const LITELLM_URL = process.env.LITELLM_PROXY_URL ?? "http://localhost:4000";
const LITELLM_KEY = process.env.LITELLM_MASTER_KEY ?? "sk-local-dev";

export type AIModel =
  | "local-fast" // llama3.2:3b (Ollama) - respuestas rápidas
  | "local-coder" // qwen2.5-coder:7b (Ollama) - tareas de código
  | "local-reason" // deepseek-r1:7b (Ollama) - razonamiento
  | "deepseek-free" // DeepSeek API gratuita
  | "gemini-flash-free" // Gemini 1.5 Flash gratuito
  | "claude-paid" // Claude — usar con moderación
  | "gpt4o-paid"; // GPT-4o — usar con moderación

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(
  model: AIModel,
  messages: ChatMessage[],
  maxTokens = 1000,
): Promise<string> {
  const response = await fetch(`${LITELLM_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LITELLM_KEY}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });

  if (!response.ok) {
    throw new Error(`LiteLLM error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? "";
}
