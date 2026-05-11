import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/server/auth/password'

const prisma = new PrismaClient()

async function main() {
  const commonPassword = '123456'
  const hashedPassword = await hashPassword(commonPassword)

  // 1. Superadmin: dany76162@gmail.com
  const superadminEmail = 'dany76162@gmail.com'
  await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {
      isPlatformAdmin: true,
      isActive: true,
      passwordHash: hashedPassword,
    },
    create: {
      email: superadminEmail,
      fullName: 'Dany Superadmin',
      isPlatformAdmin: true,
      isActive: true,
      passwordHash: hashedPassword,
    }
  })
  console.log('Superadmin configurado:', superadminEmail)

  // 2. Admin Inmobiliario: danielcata2023@gmail.com
  const adminEmail = 'danielcata2023@gmail.com'
  const orgId = 'org_north'

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      isPlatformAdmin: false,
      isActive: true,
      passwordHash: hashedPassword,
    },
    create: {
      email: adminEmail,
      fullName: 'Daniel Admin Inmobiliario',
      isPlatformAdmin: false,
      isActive: true,
      passwordHash: hashedPassword,
    }
  })

  // Create membership to org_north
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: adminUser.id,
        organizationId: orgId
      }
    },
    update: {
      role: 'OWNER'
    },
    create: {
      userId: adminUser.id,
      organizationId: orgId,
      role: 'OWNER'
    }
  })
  console.log('Admin Inmobiliario configurado en North Hill:', adminEmail)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
