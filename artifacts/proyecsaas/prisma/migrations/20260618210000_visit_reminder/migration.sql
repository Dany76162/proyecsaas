-- Visit: marca para el recordatorio automático (24h antes), evita reenviar
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
