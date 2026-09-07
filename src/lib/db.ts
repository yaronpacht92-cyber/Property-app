import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";
import { isProductionRuntime } from "@/lib/runtime-flags";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function isNextBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function createPrismaClient() {
  let connectionString = process.env.DATABASE_URL;

  // Vercel compiles pages without secrets sometimes; don't crash the build.
  // Runtime requests still require a real DATABASE_URL.
  if (!connectionString) {
    if (isNextBuildPhase()) {
      connectionString = "postgresql://build:build@127.0.0.1:5432/build";
    } else {
      throw new Error("DATABASE_URL is not configured.");
    }
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

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/** Lazy client so `next build` can import route modules without a live database. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
