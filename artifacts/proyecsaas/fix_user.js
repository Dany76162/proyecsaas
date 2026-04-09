const { PrismaClient } = require("@prisma/client");

// Manually set DATABASE_URL if not present (from .env)
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://proyecsaas_user:1234@localhost:5432/proyecsaas";

const prisma = new PrismaClient();

async function fixUser() {
  const email = "danielcata2023@gmail.com";
  console.log(`Buscando usuario: ${email}...`);
  
  try {
    const user = await prisma.user.findFirst({ where: { email } });
    
    if (!user) {
      console.log("Usuario no existe, creándolo...");
      await prisma.user.create({
        data: {
          id: "user_cata_" + Date.now(),
          email,
          fullName: "Daniel Cata",
          isActive: true,
        }
      });
    } else {
      console.log("Usuario encontrado, forzando estado activo y borrando contraseña específica...");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          passwordHash: null
        }
      });
    }
    
    // Also ensure the membership exists for org_north (default)
    const org = await prisma.organization.findFirst({ where: { slug: "north-hill" } });
    if (org) {
      const dbUser = await prisma.user.findFirst({ where: { email } });
      const membership = await prisma.membership.findFirst({ 
        where: { userId: dbUser.id, organizationId: org.id } 
      });
      
      if (!membership) {
        console.log("Creando membresía para el usuario...");
        await prisma.membership.create({
          data: {
            id: "mem_cata_" + Date.now(),
            userId: dbUser.id,
            organizationId: org.id,
            role: "OWNER"
          }
        });
      }
    }

    console.log("¡Hecho! Todo configurado. Ahora intentá entrar con '123456'.");
  } catch (err) {
    console.error("Error al configurar el usuario:", err);
  } finally {
    await prisma.$disconnect();
  }
}

fixUser();
