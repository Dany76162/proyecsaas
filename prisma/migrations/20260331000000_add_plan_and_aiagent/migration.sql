-- FASE 3A: Commercial catalog foundation — Plan + AiAgent
-- Additive migration: creates two new tables, no existing tables are modified.

-- ─── Plan ─────────────────────────────────────────────────────────────────────
-- Catalog of available plans. Uses a human-readable slug as PK so the
-- application code can reference plans by stable, legible identifiers
-- ("piloto", "starter", "growth") without needing a lookup join.

CREATE TABLE "Plan" (
    "id"                           TEXT         NOT NULL,
    "name"                         TEXT         NOT NULL,
    "description"                  TEXT,
    "sortOrder"                    INTEGER      NOT NULL,
    "isActive"                     BOOLEAN      NOT NULL DEFAULT true,

    -- Quantitative limits (NULL = unlimited)
    "maxUsers"                     INTEGER,
    "maxProperties"                INTEGER,
    "maxAiAgents"                  INTEGER,
    "maxWhatsAppChannels"          INTEGER,

    -- Feature flags
    "canUseAiAgents"               BOOLEAN      NOT NULL DEFAULT false,
    "canUseAutomations"            BOOLEAN      NOT NULL DEFAULT false,
    "canUsePropertySync"           BOOLEAN      NOT NULL DEFAULT false,
    "canExportData"                BOOLEAN      NOT NULL DEFAULT false,
    "canUseMultipleWhatsAppChannels" BOOLEAN    NOT NULL DEFAULT false,

    "createdAt"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- ─── AiAgent ──────────────────────────────────────────────────────────────────
-- Minimal model. Intentionally sparse: only the fields needed for tenant
-- ownership, feature enforcement (isActive count), and future expansion.
-- No prompt/config columns yet — those come in the next AI Agents phase.

CREATE TABLE "AiAgent" (
    "id"             TEXT         NOT NULL,
    "organizationId" TEXT         NOT NULL,
    "name"           TEXT         NOT NULL,
    "type"           TEXT         NOT NULL,
    "isActive"       BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

-- Index used by the entitlement service to COUNT active agents per tenant
CREATE INDEX "AiAgent_organizationId_isActive_idx"
    ON "AiAgent"("organizationId", "isActive");

ALTER TABLE "AiAgent"
    ADD CONSTRAINT "AiAgent_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
