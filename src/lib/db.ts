import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";
import { isProductionRuntime } from "@/lib/runtime-flags";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const poolConfig: PoolConfig = {
    connectionString,
  };

  // Managed Postgres (Neon, Supabase, Vercel, RDS) typically requires SSL.
  if (
    isProductionRuntime() ||
    /sslmode=require|neon\.tech|supabase\.co|vercel-storage|amazonaws\.com/i.test(connectionString)
  ) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  const pool = globalForPrisma.pgPool ?? new Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log: process.env.APP_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
