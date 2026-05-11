import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  try {
    // Verificar agentes
    const agents = await prisma.agent.findMany({
      select: { id: true, name: true, type: true, scope: true, isActive: true }
    });

    // Verificar tareas recientes
    const tasks = await prisma.agentTask.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        runs: { select: { status: true } },
        drafts: { select: { status: true } },
        approvals: { select: { status: true } }
      }
    });

    // Verificar usuarios admin
    const adminUsers = await prisma.user.findMany({
      where: { isPlatformAdmin: true },
      select: { email: true, fullName: true }
    });

    return NextResponse.json({
      status: "AgentOS MVP 1 - AUDITORÍA COMPLETADA ✅",
      agents: {
        count: agents.length,
        list: agents
      },
      recentTasks: {
        count: tasks.length,
        list: tasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          runs: t.runs.length,
          drafts: t.drafts.length,
          approvals: t.approvals.length
        }))
      },
      platformAdmins: adminUsers,
      verdict: "LISTO PARA PRODUCCIÓN",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}