import OpenAI from "openai";

export const AI_MODEL = "gpt-4o-mini";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (_client) return _client;

  const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? "placeholder";

  if (!baseURL) {
    throw new Error(
      "AI_INTEGRATIONS_OPENAI_BASE_URL is not set. Make sure the Replit AI integration is configured."
    );
  }

  _client = new OpenAI({ baseURL, apiKey });
  return _client;
}
