import { PrismaClient, AgentScope, AgentType } from "@prisma/client";

const prisma = new PrismaClient();

async function seedAgentOS() {
  console.log("🌱 Inicializando AgentOS...");

  // Verificar si ya existen agentes
  const existingAgents = await prisma.agent.count({
    where: { scope: AgentScope.PLATFORM }
  });

  if (existingAgents > 0) {
    console.log("✅ Agentes AgentOS ya existen, saltando inicialización");
    return;
  }

  console.log("📝 Creando agentes AgentOS...");

  // Crear Director Operativo IA
  const orchestrator = await prisma.agent.create({
    data: {
      scope: AgentScope.PLATFORM,
      organizationId: null,
      name: "Director Operativo IA",
      type: AgentType.ORCHESTRATOR,
      isActive: true,
      config: {
        description: "Agente principal que coordina y asigna tareas a otros agentes especializados",
        capabilities: ["task_assignment", "workflow_orchestration", "quality_control"],
        tone: "professional"
      }
    }
  });

  // Crear Agente de Marketing
  const marketingAgent = await prisma.agent.create({
    data: {
      scope: AgentScope.PLATFORM,
      organizationId: null,
      name: "Agente de Marketing",
      type: AgentType.MARKETING,
      isActive: true,
      config: {
        description: "Especialista en creación de contenido para redes sociales y marketing digital",
        capabilities: ["content_creation", "social_media_strategy", "brand_voice"],
        platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "WHATSAPP_BUSINESS"],
        tone: "professional",
        language: "Spanish",
        target_audience: "real_estate_professionals"
      }
    }
  });

  console.log("✅ Agentes AgentOS creados:");
  console.log(`   - ${orchestrator.name} (ID: ${orchestrator.id})`);
  console.log(`   - ${marketingAgent.name} (ID: ${marketingAgent.id})`);
}

async function main() {
  try {
    await seedAgentOS();
    console.log("🎉 Inicialización AgentOS completada");
  } catch (error) {
    console.error("❌ Error inicializando AgentOS:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
