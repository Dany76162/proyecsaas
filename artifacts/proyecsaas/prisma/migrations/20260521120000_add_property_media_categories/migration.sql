-- Unified media manager support for property images and panorama capture direction.

CREATE TYPE "PropertyImageCategory" AS ENUM ('PANORAMA', 'REAL', 'RENDER', 'PROGRESS');

ALTER TABLE "PropertyImage"
  ADD COLUMN "category" "PropertyImageCategory" NOT NULL DEFAULT 'REAL';

ALTER TABLE "PropertyPanorama"
  ADD COLUMN "direction" TEXT;
