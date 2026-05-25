import OpenAI from "openai";

export const AI_MODEL = "gpt-4o-mini";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (_client) return _client;

  // Prioritize active and valid keys
  const candidateKeys = [
    process.env["OPENAI_API_KEY"],
    process.env["AI_INTEGRATIONS_OPENAI_API_KEY"]
  ];

  let apiKey = "";
  for (const k of candidateKeys) {
    const trimmed = k?.trim();
    if (trimmed && trimmed !== "dummy" && trimmed !== "placeholder" && trimmed !== "sk-...") {
      apiKey = trimmed;
      break;
    }
  }

  // Fallback to the first available if no valid key was found
  if (!apiKey) {
    apiKey = (process.env["OPENAI_API_KEY"] || process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] || "placeholder").trim();
  }

  // Handle baseURL resolution
  let baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"]?.trim() || process.env["OPENAI_BASE_URL"]?.trim();

  // If using Replit API key, prioritize Replit base URL
  if (apiKey === process.env["AI_INTEGRATIONS_OPENAI_API_KEY"]?.trim() && process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"]) {
    baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"].trim();
  }

  const config: { apiKey: string; baseURL?: string } = { apiKey };
  if (baseURL) {
    config.baseURL = baseURL;
  }

  _client = new OpenAI(config);
  return _client;
}
