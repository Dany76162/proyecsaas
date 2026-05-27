import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { listOrganizationsForPlatform } from "@/modules/platform/service";

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

    // 3. Query if the sandbox organization exists in production
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

    // Determine specific sub-states
    const existsOrg = !!existingOrg;
    const hasSub = !!existingOrg?.subscription;
    const hasMembership = existingOrg?.memberships.some(m => m.userId === sessionUser.id) ?? false;

    // Determine general state
    let generalState = "OK";
    if (!existsOrg) {
      generalState = "FALTA_SANDBOX";
    } else if (!hasSub) {
      generalState = "FALTA_SUBSCRIPCION";
    } else if (!hasMembership) {
      generalState = "FALTA_MEMBRESIA";
    }

    // 4. Run the query that lists organizations for the UI to confirm visibility
    const orgsListInUI = await listOrganizationsForPlatform();
    const sandboxInUIResult = orgsListInUI.find(o => o.slug === targetSlug) || null;

    return NextResponse.json({
      success: true,
      diagnostic: {
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
        existsInDB: existsOrg,
        orgId: existingOrg?.id || null,
        slug: existingOrg?.slug || null,
        hasSubscription: hasSub,
        hasMembershipWithOwner: hasMembership,
        memberships: existingOrg?.memberships.map(m => ({
          userId: m.user.id,
          email: m.user.email,
          fullName: m.user.fullName,
          role: m.role
        })) || [],
        subscription: existingOrg?.subscription || null
      },
      generalState,
      listQueryResult: {
        totalOrgsFound: orgsListInUI.length,
        sandboxAppearsInQuery: !!sandboxInUIResult,
        sandboxRecordInQuery: sandboxInUIResult
      }
    });
  } catch (error: any) {
    console.error("Platform Diagnose Read-Only Route Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || String(error)
    }, { status: 500 });
  }
}
