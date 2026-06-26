-- Fase 2 sync: tracking de errores y reintentos con backoff (aditivo, no destructivo).
ALTER TABLE "Organization" ADD COLUMN "propertySourceErrorMessage" TEXT;
ALTER TABLE "Organization" ADD COLUMN "propertySourceAttemptCount" INTEGER NOT NULL DEFAULT 0;
