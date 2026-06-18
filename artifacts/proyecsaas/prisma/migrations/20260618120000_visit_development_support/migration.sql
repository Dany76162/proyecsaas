-- Visit: soportar visitas a desarrollos/lotes, no solo propiedades
ALTER TABLE "Visit" ALTER COLUMN "propertyId" DROP NOT NULL;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "developmentId" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "lotId" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "targetLabel" TEXT;
