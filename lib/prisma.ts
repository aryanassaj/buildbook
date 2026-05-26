import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient() {
  // POSTGRES_PRISMA_URL is set automatically by Vercel Postgres (pooled via PgBouncer)
  const connectionString = process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("No database connection string (set DATABASE_URL or POSTGRES_PRISMA_URL)");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
