import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

type OpenAiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
} | null | undefined;

// Precio por 1.000 tokens (USD). Aproximado a la lista pública de OpenAI.
const PRICING_PER_1K: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4.1": { input: 0.002, output: 0.008 },
  "gpt-4.1-mini": { input: 0.0004, output: 0.0016 },
  "gpt-4.1-nano": { input: 0.0001, output: 0.0004 },
};

const DEFAULT_PRICING = { input: 0.0005, output: 0.0015 };

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING_PER_1K[model] ?? DEFAULT_PRICING;
  const cost = (promptTokens / 1000) * pricing.input + (completionTokens / 1000) * pricing.output;
  // Redondeo a 6 decimales para evitar ruido de punto flotante.
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/**
 * Registra el consumo real de tokens de una llamada a OpenAI.
 * Best-effort: nunca lanza ni bloquea el flujo de IA que lo invoca.
 * Recibe el cliente Prisma a usar (en el worker se pasa prismaWorker).
 */
export async function logAiUsage(
  db: Db,
  params: {
    organizationId?: string | null;
    model: string;
    source: string;
    usage: OpenAiUsage;
  },
): Promise<void> {
  try {
    const promptTokens = params.usage?.prompt_tokens ?? 0;
    const completionTokens = params.usage?.completion_tokens ?? 0;
    const totalTokens = params.usage?.total_tokens ?? promptTokens + completionTokens;
    if (totalTokens <= 0) return;

    await db.aiUsageEvent.create({
      data: {
        organizationId: params.organizationId ?? null,
        model: params.model,
        source: params.source,
        promptTokens,
        completionTokens,
        totalTokens,
        costUsd: estimateCostUsd(params.model, promptTokens, completionTokens),
      },
    });
  } catch {
    /* best-effort: el tracking de costos nunca rompe la IA */
  }
}
