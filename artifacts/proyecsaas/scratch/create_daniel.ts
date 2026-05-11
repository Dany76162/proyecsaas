import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/server/auth/password'

const prisma = new PrismaClient()

async function main() {
  const email = 'danielcata2023@gmail.com'
  const password = '123456' // Using the shared password for consistency
  const hashedPassword = await hashPassword(password)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
        isActive: true,
        isPlatformAdmin: true,
    },
    create: {
      email,
      fullName: 'Daniel Cata',
      passwordHash: hashedPassword,
      isPlatformAdmin: true,
      isActive: true,
    }
  })
  console.log('User created/updated successfully:', user.email)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
