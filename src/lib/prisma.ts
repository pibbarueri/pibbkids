import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  // Serverless: many concurrent function instances each open their own pool — keep this
  // modest. Pairs with the Supabase transaction pooler (not the 15-connection session
  // pooler), which multiplexes many logical connections onto few physical ones, so each
  // instance can afford a few rather than being capped at 1.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 5 });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
