/**
 * Fix: reservationAmountStage1Cents de Valles del Pino
 *
 * El dato quedó guardado como 100 (= ARS 1) en lugar de 100000 (= ARS 1.000).
 * Este script corrige el valor directamente en DB.
 *
 * Uso (apuntando a producción):
 *   DATABASE_URL="postgresql://..." npx ts-node scripts/fix-reservation-amount-valles-del-pino.ts
 *
 * O desde Railway CLI:
 *   railway run npx ts-node scripts/fix-reservation-amount-valles-del-pino.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEVELOPMENT_ID = "cmq5rwj7h0001nw5hxpqu2rrv";

async function main() {
  const before = await prisma.development.findUnique({
    where: { id: DEVELOPMENT_ID },
    select: {
      name: true,
      reservationCurrency: true,
      reservationAmountStage1Cents: true,
      reservationAmountStage2Cents: true,
      reservationAmountStage3Cents: true,
      reservationAmountStage4Cents: true,
      reservationAmountStage5Cents: true,
    },
  });

  if (!before) {
    console.error("❌ Desarrollo no encontrado:", DEVELOPMENT_ID);
    process.exit(1);
  }

  console.log("📋 Antes:");
  console.log("  Desarrollo:", before.name);
  console.log("  reservationCurrency:", before.reservationCurrency);
  console.log("  Stage1Cents:", before.reservationAmountStage1Cents, "→ display:", before.reservationAmountStage1Cents ? before.reservationAmountStage1Cents / 100 : null, before.reservationCurrency);
  console.log("  Stage2Cents:", before.reservationAmountStage2Cents);
  console.log("  Stage3Cents:", before.reservationAmountStage3Cents);
  console.log("  Stage4Cents:", before.reservationAmountStage4Cents);
  console.log("  Stage5Cents:", before.reservationAmountStage5Cents);

  const updated = await prisma.development.update({
    where: { id: DEVELOPMENT_ID },
    data: {
      reservationCurrency: "ARS",
      reservationAmountStage1Cents: 100000, // ARS 1.000 × 100 = 100000
      reservationAmountStage2Cents: null,
      reservationAmountStage3Cents: null,
      reservationAmountStage4Cents: null,
      reservationAmountStage5Cents: null,
    },
    select: {
      reservationCurrency: true,
      reservationAmountStage1Cents: true,
    },
  });

  console.log("\n✅ Después:");
  console.log("  reservationCurrency:", updated.reservationCurrency);
  console.log("  Stage1Cents:", updated.reservationAmountStage1Cents, "→ display:", (updated.reservationAmountStage1Cents ?? 0) / 100, updated.reservationCurrency);
  console.log("\n🎯 Landing pública mostrará: ARS 1.000");
  console.log("🎯 Mercado Pago generará checkout por: ARS 1.000 (amount=1000, currency=ARS)");
}

main()
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
