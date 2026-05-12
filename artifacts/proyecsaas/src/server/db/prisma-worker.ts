import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
    prismaWorker?: PrismaClient;
};

export const prismaWorker =
    globalForPrisma.prismaWorker ??
    new PrismaClient({
        log: ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaWorker = prismaWorker;
}
