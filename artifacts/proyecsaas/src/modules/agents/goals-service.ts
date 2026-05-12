import "server-only";

import { prisma } from "@/server/db/prisma";
import { 
  GoalStatus, 
  GoalType, 
  AgentPriority, 
  TaskStatus,
  AgentLogLevel 
} from "@prisma/client";
import { getOpenAIClient, OPENAI_MODEL, createAgentLog } from "./service";

export async function listAgentGoals() {
  return prisma.agentGoal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { tasks: true }
      },
      tasks: {
        select: {
          status: true
        }
      }
    }
  });
}

export async function getAgentGoalDetail(id: string) {
  return prisma.agentGoal.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: { createdAt: "desc" },
        include: {
          agent: { select: { name: true, type: true } }
        }
      }
    }
  });
}

export async function createAgentGoal(data: {
  title: string;
  description?: string;
  priority: AgentPriority;
  type: GoalType;
  targetDate?: Date;
}) {
  const goal = await prisma.agentGoal.create({
    data: {
      ...data,
      status: GoalStatus.PENDING,
      progress: 0
    }
  });

  await createAgentLog({
    level: AgentLogLevel.INFO,
    message: `Objetivo creado: ${goal.title}`,
    metadata: { goalId: goal.id }
  });

  return goal;
}

export async function calculateGoalProgress(goalId: string) {
  const goal = await prisma.agentGoal.findUnique({
    where: { id: goalId },
    include: {
      tasks: { select: { status: true } }
    }
  });

  if (!goal || goal.tasks.length === 0) return 0;

  const completed = goal.tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
  const progress = Math.round((completed / goal.tasks.length) * 100);

  await prisma.agentGoal.update({
    where: { id: goalId },
    data: { 
      progress,
      status: progress === 100 ? GoalStatus.COMPLETED : GoalStatus.IN_PROGRESS
    }
  });

  return progress;
}

export async function suggestTasksForGoal(goalId: string) {
  const goal = await prisma.agentGoal.findUnique({
    where: { id: goalId }
  });

  if (!goal) throw new Error("Objetivo no encontrado");

  const openai = getOpenAIClient();

  const prompt = `
Actúa como el Director Operativo IA de RaicesPilot.
Tu objetivo es dividir una meta operativa en un conjunto de tareas accionables para el equipo de agentes IA.

Meta Operativa: ${goal.title}
Descripción: ${goal.description || "Sin descripción"}
Tipo: ${goal.type}
Prioridad: ${goal.priority}

Genera una lista de 3 a 7 tareas sugeridas. Cada tarea debe tener un título y una descripción corta.
No ejecutes ninguna acción real en sistemas externos (no publicar, no enviar mensajes).
Devuelve estrictamente un JSON válido con este formato:
[
  { "title": "Título de la tarea", "description": "Descripción corta" },
  ...
]
`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: "Eres el Director Operativo IA de RaicesPilot. Responde solo con JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const rawContent = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawContent);
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : parsed.suggestions || Object.values(parsed)[0];

    if (!Array.isArray(tasks)) {
      throw new Error("Formato de respuesta IA inválido");
    }

    await createAgentLog({
      level: AgentLogLevel.INFO,
      message: `Tareas sugeridas generadas para el objetivo: ${goal.title}`,
      metadata: { goalId: goal.id, taskCount: tasks.length }
    });

    return tasks as { title: string; description: string }[];
  } catch (error: any) {
    await createAgentLog({
      level: AgentLogLevel.ERROR,
      message: `Error al sugerir tareas para el objetivo: ${goal.title}`,
      metadata: { goalId: goal.id, error: error.message }
    });
    throw error;
  }
}
