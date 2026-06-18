-- Lead: vínculo de interés a un desarrollo/lote (paridad CRM con propiedades)
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "developmentId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lotId" TEXT;
CREATE INDEX IF NOT EXISTS "Lead_organizationId_developmentId_idx" ON "Lead" ("organizationId", "developmentId");
