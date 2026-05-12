const { PrismaClient } = require("@prisma/client");

// Use the same DB URL as in .env or fix_user.js
process.env.DATABASE_URL = "postgresql://proyecsaas_user:1234@localhost:5432/proyecsaas";

const prisma = new PrismaClient();

async function setup() {
  console.log("Setting up users...");

  try {
    // 1. Superadmin: dany76162@gmail.ocm
    const superadminEmail = "dany76162@gmail.ocm";
    let superadmin = await prisma.user.findUnique({ where: { email: superadminEmail } });
    
    if (!superadmin) {
      console.log(`Creating superadmin: ${superadminEmail}`);
      superadmin = await prisma.user.create({
        data: {
          email: superadminEmail,
          fullName: "Super Admin Dany",
          isPlatformAdmin: true,
          isActive: true,
        }
      });
    } else {
      console.log(`Updating superadmin: ${superadminEmail}`);
      await prisma.user.update({
        where: { id: superadmin.id },
        data: { isPlatformAdmin: true, isActive: true }
      });
    }

    // 2. Admin: danielcata2023@gmail.com
    const adminEmail = "danielcata2023@gmail.com";
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    
    if (!admin) {
      console.log(`Creating admin: ${adminEmail}`);
      admin = await prisma.user.create({
        data: {
          email: adminEmail,
          fullName: "Daniel Cata Admin",
          isPlatformAdmin: false,
          isActive: true,
        }
      });
    } else {
      console.log(`Updating admin: ${adminEmail}`);
      await prisma.user.update({
        where: { id: admin.id },
        data: { isActive: true }
      });
    }

    // Ensure they have memberships if needed
    const org = await prisma.organization.findFirst({ where: { slug: "north-hill" } });
    if (org) {
      // Superadmin membership (optional but good)
      const saMembership = await prisma.membership.findUnique({
        where: { userId_organizationId: { userId: superadmin.id, organizationId: org.id } }
      });
      if (!saMembership) {
        await prisma.membership.create({
          data: { userId: superadmin.id, organizationId: org.id, role: "OWNER" }
        });
      }

      // Admin membership
      const adminMembership = await prisma.membership.findUnique({
        where: { userId_organizationId: { userId: admin.id, organizationId: org.id } }
      });
      if (!adminMembership) {
        await prisma.membership.create({
          data: { userId: admin.id, organizationId: org.id, role: "OWNER" }
        });
      }
    }

    console.log("Users setup complete!");
    console.log("Credentials:");
    console.log("- Superadmin: dany76162@gmail.ocm / 123456");
    console.log("- Admin: danielcata2023@gmail.com / 123456");

  } catch (error) {
    console.error("Error setting up users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

setup();
