import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  // Serverless: many concurrent function instances each open their own pool — keep this
  // small (pairs with the Supabase transaction pooler, not the 15-connection session pooler).
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
