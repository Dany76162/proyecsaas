import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { listOrganizationsForPlatform, listPlatformPlans } from "@/modules/platform/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate platform admin securely
    const sessionUser = await requirePlatformAdmin();
    
    // 2. Query user and memberships from production DB
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        memberships: {
          include: {
            organization: {
              select: { id: true, name: true, slug: true, isActive: true, deletedAt: true }
            }
          }
        }
      }
    });

    const targetSlug = "raicespilot-qa-test";

    // 3. Query if the sandbox organization already exists in production
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: targetSlug },
      include: {
        subscription: true,
        memberships: {
          include: {
            user: { select: { id: true, email: true, fullName: true } }
          }
        }
      }
    });

    let actionTaken = "Ninguna. Todo correcto.";
    let createdOrgDetails = null;

    // 4. Self-healing logic: If organization does not exist in production, create it!
    if (!existingOrg) {
      // Find available plans in production DB
      const availablePlans = await prisma.plan.findMany({ select: { id: true } });
      const preferredPlan = availablePlans.find(p => 
        p.id.toLowerCase().includes("piloto") || 
        p.id.toLowerCase().includes("founder") || 
        p.id.toLowerCase().includes("starter")
      );
      const planIdToUse = preferredPlan ? preferredPlan.id : (availablePlans[0]?.id || "piloto");

      const createdOrg = await prisma.organization.create({
        data: {
          name: "RaicesPilot QA Test",
          slug: targetSlug,
          city: "Buenos Aires",
          isActive: true,
          description: "Organización de pruebas y sandbox interno del sistema QA Operativo.",
          planLabel: "$65.000 + impuestos",
          subscription: {
            create: {
              planId: planIdToUse,
              status: "ACTIVE",
              billingMode: "COURTESY",
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              planCode: "FOUNDER",
              paidCycles: 1,
              aiStatus: "ACTIVE",
              aiMonthlyConversationLimit: 300,
              aiMonthlyConversationsUsed: 0,
              lifetimeGrantedAt: null,
              internalBillingNotes: "internal-sandbox: RaicesPilot QA Test. No contabilizar en métricas comerciales reales."
            }
          },
          memberships: {
            create: {
              userId: sessionUser.id,
              role: "OWNER"
            }
          }
        },
        include: {
          subscription: true,
          memberships: true
        }
      });
      actionTaken = `Creado sandbox 'raicespilot-qa-test' y asociado OWNER a ${sessionUser.email}`;
      createdOrgDetails = createdOrg;
    } else {
      // If organization exists but the session user does not have membership, link them!
      const userHasMembership = existingOrg.memberships.some(m => m.userId === sessionUser.id);
      
      if (!userHasMembership) {
        const newMembership = await prisma.membership.create({
          data: {
            userId: sessionUser.id,
            organizationId: existingOrg.id,
            role: "OWNER"
          }
        });
        actionTaken = `Asociado OWNER existente ${sessionUser.email} a la organización sandbox existente`;
        createdOrgDetails = newMembership;
      }
    }

    // 5. Run the actual query that lists organizations for the UI
    const orgsListInUI = await listOrganizationsForPlatform();
    const sandboxInUIResult = orgsListInUI.find(o => o.slug === targetSlug) || null;

    return NextResponse.json({
      success: true,
      diagnosticContext: {
        session: {
          userId: sessionUser.id,
          email: sessionUser.email,
          fullName: sessionUser.fullName,
          isPlatformAdmin: sessionUser.isPlatformAdmin
        },
        databaseUser: dbUser ? {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          isPlatformAdmin: dbUser.isPlatformAdmin,
          memberships: dbUser.memberships.map(m => ({
            orgId: m.organization.id,
            orgName: m.organization.name,
            orgSlug: m.organization.slug,
            role: m.role,
            orgDeletedAt: m.organization.deletedAt
          }))
        } : null
      },
      sandboxStatus: {
        existsInDB: !!existingOrg,
        orgId: existingOrg?.id || null,
        slug: existingOrg?.slug || null,
        memberships: existingOrg?.memberships.map(m => ({
          userId: m.user.id,
          email: m.user.email,
          fullName: m.user.fullName,
          role: m.role
        })) || [],
        subscription: existingOrg?.subscription || null
      },
      actionTaken,
      createdOrgDetails,
      listQueryResult: {
        totalOrgsFound: orgsListInUI.length,
        sandboxAppearsInQuery: !!sandboxInUIResult,
        sandboxRecordInQuery: sandboxInUIResult
      }
    });
  } catch (error: any) {
    console.error("Platform Diagnose Route Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || String(error)
    }, { status: 500 });
  }
}
