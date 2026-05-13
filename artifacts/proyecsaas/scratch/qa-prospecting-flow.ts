import { analyzeProspectsAction, importProspectsAction } from "../src/modules/prospecting/actions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const testText = `
Inmobiliaria Norte, Córdoba, contacto@inmobiliarianorte.com, www.inmobiliarianorte.com
Desarrolladora Sur, Buenos Aires, info@desarrolladorasur.com, www.desarrolladorasur.com
Constructora Los Robles, Mendoza, ventas@losrobles.com.ar, www.losrobles.com.ar
  `;

  console.log("--- QA: SEMI-ASSISTED FLOW ---");
  console.log("Analyzing text...");
  
  const analysisRes = await analyzeProspectsAction(testText);
  if (!analysisRes.success) {
    console.error("Analysis failed:", analysisRes);
    return;
  }

  const candidates = analysisRes.candidates;
  console.log("Candidates detected:", candidates.length);
  candidates.forEach((c: any) => {
    console.log(` - ${c.companyName} (${c.companyType}) | ${c.email} | ${c.city}`);
  });

  if (candidates.length !== 3) {
    console.error("Expected 3 candidates, found", candidates.length);
  }

  console.log("\nImporting candidates...");
  const importRes = await importProspectsAction(candidates.map(c => ({ ...c, selected: true })));
  console.log("Import result:", importRes);

  console.log("\nVerifying database state...");
  const prospects = await prisma.commercialProspect.findMany({
    where: { 
      companyName: { in: candidates.map((c: any) => c.companyName) } 
    }
  });

  prospects.forEach(p => {
    console.log(`Prospect: ${p.companyName} | Status: ${p.status} | Manual: ${p.manualStatus}`);
    if (p.status !== "NEEDS_REVIEW" || p.manualStatus !== "REVISAR") {
      console.error(`ERROR: Wrong status for ${p.companyName}`);
    }
  });

  // Check for auto-generated emails (should be 0)
  const drafts = await prisma.prospectingMessageDraft.findMany({
    where: { prospectId: { in: prospects.map(p => p.id) } }
  });
  console.log("Drafts created automatically:", drafts.length);
  if (drafts.length > 0) {
    console.error("ERROR: Emails generated automatically!");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
