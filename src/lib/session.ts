import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { PermissionKey } from "@/lib/permissions";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    redirect("/login");
  }
  return session;
}

export async function requirePermission(permission: PermissionKey | PermissionKey[]) {
  const session = await requireSession();
  if (!hasPermission(session.user.permissions, permission)) {
    redirect("/home?error=permission");
  }
  return session;
}

export async function getPropertyAccessFilter(
  _userId: string,
  organizationId: string,
  _roleKey: string,
) {
  // All users are super admins — full org property access.
  return {
    organizationId,
    deletedAt: null,
  };
}

export async function assertPropertyAccess(
  propertyId: string,
  organizationId: string,
  _userId: string,
  _roleKey: string,
) {
  return prisma.property.findFirst({
    where: {
      id: propertyId,
      organizationId,
      deletedAt: null,
    },
  });
}
