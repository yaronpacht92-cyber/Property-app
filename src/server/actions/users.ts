"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z
    .string()
    .min(12)
    .regex(/[A-Z]/, "uppercase")
    .regex(/[a-z]/, "lowercase")
    .regex(/[0-9]/, "number"),
  roleId: z.string().uuid(),
});

export async function addUserAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.USERS_MANAGE);
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      error:
        "Please enter a name, valid email, role, and a password with at least 12 characters including upper, lower, and a number.",
    };
  }

  const role = await prisma.role.findFirst({
    where: {
      id: parsed.data.roleId,
      organizationId: session.user.organizationId,
    },
  });
  if (!role) return { error: "Please choose a valid role." };

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Someone with that email is already in Pachtfolio." };
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      memberships: {
        create: {
          organizationId: session.user.organizationId,
          roleId: role.id,
        },
      },
    },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "user.created",
    entityType: "User",
    entityId: user.id,
    summary: `Added user ${user.name}`,
    metadata: { role: role.key },
  });

  revalidatePath("/settings/users");
  return { success: `${user.name} can now sign in.` };
}
