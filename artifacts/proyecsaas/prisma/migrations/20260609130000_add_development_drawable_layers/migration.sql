-- Fase 1: capas dibujables del proyecto.
-- Additive only: nueva tabla y relación con Development.

CREATE TABLE "DevelopmentDrawableLayer" (
  "id" TEXT NOT NULL,
  "developmentId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "bloqueada" BOOLEAN NOT NULL DEFAULT false,
  "geometria" JSONB,
  "colorRelleno" TEXT DEFAULT '#22c55e',
  "colorBorde" TEXT DEFAULT '#16a34a',
  "opacidad" DOUBLE PRECISION DEFAULT 0.35,
  "grosorBorde" DOUBLE PRECISION DEFAULT 2,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DevelopmentDrawableLayer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DevelopmentDrawableLayer_developmentId_fkey"
    FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE
);

CREATE INDEX "DevelopmentDrawableLayer_developmentId_orden_idx"
  ON "DevelopmentDrawableLayer"("developmentId", "orden");
