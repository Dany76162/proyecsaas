import { prisma } from "./src/server/db/prisma";

async function checkUser() {
  const email = "danielcata2023@gmail.com";
  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true, isActive: true, passwordHash: true }
  });

  if (!user) {
    const allUsers = await prisma.user.findMany({ take: 5, select: { email: true } });
    console.log(`User ${email} not found.`);
    console.log(`Available users:`, allUsers.map(u => u.email));
  } else {
    console.log(`User found:`, user);
    console.log(`passwordHash exists:`, !!user.passwordHash);
  }
}

checkUser().catch(console.error);
