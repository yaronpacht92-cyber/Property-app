import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  PERMISSION_CATALOG,
  ROLE_KEYS,
  ROLE_PERMISSIONS,
} from "@/lib/permissions";

const ROLE_DEFS = [
  { key: ROLE_KEYS.ADMIN, name: "Family Administrator" },
  { key: ROLE_KEYS.MEMBER, name: "Family Member" },
  { key: ROLE_KEYS.READ_ONLY, name: "Read-Only User" },
] as const;

/** Ensure global permission rows exist (idempotent). */
export async function ensurePermissionCatalog() {
  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      create: permission,
      update: { description: permission.description },
    });
  }
}

/**
 * Create a new family organization with the three standard roles and permissions.
 * Returns the org and the Family Administrator role.
 */
export async function createOrganizationWithRoles(input: {
  name: string;
  settings?: Prisma.InputJsonValue;
}) {
  await ensurePermissionCatalog();

  const org = await prisma.organization.create({
    data: {
      name: input.name.trim(),
      settings: input.settings ?? {
        reminderDefaults: { insuranceRenewalDays: [90, 60, 30, 7] },
      },
    },
  });

  const roles = await Promise.all(
    ROLE_DEFS.map((role) =>
      prisma.role.create({
        data: {
          organizationId: org.id,
          key: role.key,
          name: role.name,
        },
      }),
    ),
  );

  const permissions = await prisma.permission.findMany();
  for (const role of roles) {
    const keys = ROLE_PERMISSIONS[role.key] ?? [];
    for (const key of keys) {
      const permission = permissions.find((p) => p.key === key);
      if (!permission) continue;
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const adminRole = roles.find((role) => role.key === ROLE_KEYS.ADMIN);
  if (!adminRole) {
    throw new Error("Failed to create administrator role.");
  }

  return { organization: org, adminRole, roles };
}
