import "server-only";

import { toFile } from "openai";

import { getOpenAIClient } from "@/lib/ai/openai";

/**
 * Transcribe un audio (nota de voz de WhatsApp, normalmente OGG/Opus) a texto
 * usando la API de OpenAI (misma key que el resto de la IA).
 *
 * Best-effort: devuelve el texto transcripto, o `null` si no está configurada
 * la key, el audio viene vacío o la transcripción falla. El llamador decide el
 * fallback (ej. pedirle al prospecto que escriba el mensaje).
 */
export async function transcribeAudio(
  buffer: Buffer,
  filename = "audio.ogg",
): Promise<string | null> {
  if (!buffer || buffer.length === 0) return null;

  let client;
  try {
    client = getOpenAIClient();
  } catch (error) {
    console.error("[transcription] OpenAI no configurado:", (error as Error).message);
    return null;
  }

  try {
    const file = await toFile(buffer, filename);
    const result = await client.audio.transcriptions.create({
      file,
      model: process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1",
      // El mercado es LATAM: damos pista de idioma para mejorar la precisión.
      language: "es",
    });
    const text = (result as { text?: string }).text?.trim();
    return text && text.length > 0 ? text : null;
  } catch (error) {
    console.error("[transcription] falló la transcripción:", (error as Error).message);
    return null;
  }
}
