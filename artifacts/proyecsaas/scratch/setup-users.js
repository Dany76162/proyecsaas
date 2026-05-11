const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Verificando y creando usuarios de prueba...');

  const passwordHash = "dummy_hash";

  // 1. Superadmin
  let superadmin = await prisma.user.findUnique({ where: { email: 'dany76162@gmail.com' } });
  if (!superadmin) {
    superadmin = await prisma.user.create({
      data: {
        email: 'dany76162@gmail.com',
        fullName: 'Super Admin Dany',
        passwordHash,
        isPlatformAdmin: true,
      }
    });
    console.log('✅ Superadmin creado: dany76162@gmail.com');
  } else {
    // Asegurarse de que sea admin
    await prisma.user.update({
      where: { email: 'dany76162@gmail.com' },
      data: { isPlatformAdmin: true, passwordHash }
    });
    console.log('✅ Superadmin actualizado: dany76162@gmail.com');
  }

  // 2. Admin Inmobiliario y su Organización
  let admin = await prisma.user.findUnique({ where: { email: 'danielcata2023@gmail.com' } });
  
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'danielcata2023@gmail.com',
        fullName: 'Admin Inmobiliario',
        passwordHash,
      }
    });
    console.log('✅ Usuario Admin Inmobiliario creado: danielcata2023@gmail.com');
  } else {
    await prisma.user.update({
      where: { email: 'danielcata2023@gmail.com' },
      data: { passwordHash }
    });
    console.log('✅ Usuario Admin Inmobiliario actualizado: danielcata2023@gmail.com');
  }

  // Crear la organización "North Hill" si no existe
  let org = await prisma.organization.findUnique({ where: { slug: 'north-hill' } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'North Hill Realty',
        slug: 'north-hill',
      }
    });
    console.log('✅ Organización creada: North Hill Realty (/north-hill)');
  }

  // Asegurar que el admin sea dueño (OWNER) de North Hill
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: org.id
      }
    }
  });

  if (!membership) {
    await prisma.membership.create({
      data: {
        userId: admin.id,
        organizationId: org.id,
        role: 'OWNER'
      }
    });
    console.log('✅ Rol de OWNER asignado a danielcata2023 en North Hill');
  }

  console.log('¡Todos los accesos configurados correctamente!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
