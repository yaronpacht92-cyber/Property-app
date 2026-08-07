import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const password = "ChangeMe!Pachtfolio1";
  const users = await prisma.user.findMany();
  for (const user of users) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: ok ? user.passwordHash : await bcrypt.hash(password, 12),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    console.log(user.email, ok ? "password-ok" : "password-reset", "unlocked");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
