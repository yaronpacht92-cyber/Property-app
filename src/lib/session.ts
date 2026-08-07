import { auth, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { PermissionKey } from "@/lib/permissions";
import { ROLE_KEYS } from "@/lib/permissions";
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

export async function getPropertyAccessFilter(userId: string, organizationId: string, roleKey: string) {
  if (roleKey === ROLE_KEYS.READ_ONLY) {
    const assignments = await prisma.propertyAssignment.findMany({
      where: { userId },
      select: { propertyId: true },
    });
    return {
      organizationId,
      deletedAt: null,
      id: { in: assignments.map((a) => a.propertyId) },
    };
  }

  return {
    organizationId,
    deletedAt: null,
  };
}

export async function assertPropertyAccess(
  propertyId: string,
  organizationId: string,
  userId: string,
  roleKey: string,
) {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      organizationId,
      deletedAt: null,
    },
  });

  if (!property) {
    return null;
  }

  if (roleKey === ROLE_KEYS.READ_ONLY) {
    const assignment = await prisma.propertyAssignment.findUnique({
      where: {
        userId_propertyId: { userId, propertyId },
      },
    });
    if (!assignment) return null;
  }

  return property;
}
