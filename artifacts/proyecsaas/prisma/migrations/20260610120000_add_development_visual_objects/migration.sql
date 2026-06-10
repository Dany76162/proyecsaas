-- Fase 2A: objetos visuales SVG del plano.
-- Additive only: nuevos enums y nueva tabla.
-- No modifica DevelopmentDrawableLayer ni las capas geograficas/Leaflet.

CREATE TYPE "VisualGeometryKind" AS ENUM (
  'POLYGON',
  'POLYLINE',
  'RECT',
  'CIRCLE',
  'POINT',
  'TEXT'
);

CREATE TYPE "VisualCoordinateSpace" AS ENUM (
  'PLAN_VIEWBOX',
  'PLAN_NORMALIZED'
);

CREATE TYPE "VisualVisibility" AS ENUM (
  'ADMIN_ONLY',
  'PUBLIC',
  'BOTH'
);

CREATE TABLE "DevelopmentVisualObject" (
  "id" TEXT NOT NULL,
  "developmentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "tooltip" TEXT,
  "geometry" JSONB NOT NULL,
  "geometryKind" "VisualGeometryKind" NOT NULL,
  "coordinateSpace" "VisualCoordinateSpace" NOT NULL DEFAULT 'PLAN_VIEWBOX',
  "fillColor" TEXT DEFAULT '#22c55e',
  "strokeColor" TEXT DEFAULT '#166534',
  "opacity" DOUBLE PRECISION DEFAULT 0.45,
  "strokeWidth" DOUBLE PRECISION DEFAULT 2,
  "zIndex" INTEGER DEFAULT 0,
  "visibility" "VisualVisibility" NOT NULL DEFAULT 'BOTH',
  "interactive" BOOLEAN NOT NULL DEFAULT true,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DevelopmentVisualObject_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DevelopmentVisualObject_developmentId_fkey"
    FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE
);

CREATE INDEX "DevelopmentVisualObject_developmentId_zIndex_idx"
  ON "DevelopmentVisualObject"("developmentId", "zIndex");

CREATE INDEX "DevelopmentVisualObject_developmentId_visibility_idx"
  ON "DevelopmentVisualObject"("developmentId", "visibility");
