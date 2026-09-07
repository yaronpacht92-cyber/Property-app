"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createOrganizationWithRoles } from "@/lib/organization-bootstrap";
import { rateLimit } from "@/lib/rate-limit";
import { isPublicSignupEnabled } from "@/lib/runtime-flags";

const schema = z
  .object({
    organizationName: z.string().min(2).max(120),
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z
      .string()
      .min(12)
      .regex(/[A-Z]/, "uppercase")
      .regex(/[a-z]/, "lowercase")
      .regex(/[0-9]/, "number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function createAccountAction(formData: FormData) {
  if (!isPublicSignupEnabled()) {
    return {
      error: "Public account registration is turned off for this Pachtfolio deployment.",
    };
  }
  const limited = rateLimit(
    `register:${String(formData.get("email") || "unknown").toLowerCase()}`,
    5,
    15 * 60 * 1000,
  );
  if (!limited.ok) {
    return {
      error: "Too many account attempts. Please wait a few minutes and try again.",
    };
  }

  const parsed = schema.safeParse({
    organizationName: formData.get("organizationName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((issue) => issue.path.includes("confirmPassword"));
    return {
      error: mismatch
        ? "The password and confirmation do not match."
        : "Please enter your family name, your name, a valid email, and a password with at least 12 characters including upper, lower, and a number.",
    };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists. Please sign in instead." };
  }

  try {
    const { organization, adminRole } = await createOrganizationWithRoles({
      name: parsed.data.organizationName,
    });

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        email,
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        memberships: {
          create: {
            organizationId: organization.id,
            roleId: adminRole.id,
            status: "ACTIVE",
          },
        },
      },
    });

    await writeAuditLog({
      organizationId: organization.id,
      actorUserId: user.id,
      action: "account.created",
      entityType: "Organization",
      entityId: organization.id,
      summary: `Created family portfolio “${organization.name}” with admin ${user.name}`,
    });

    // Sign in immediately so the new admin lands in their empty portfolio.
    try {
      await signIn("credentials", {
        email,
        password: parsed.data.password,
        redirectTo: "/home?welcome=1",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect("/login?created=1");
      }
      throw error;
    }
  } catch (error) {
    // Successful signIn throws a NEXT_REDIRECT — let it through.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest || "").startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "We could not create that account. Please try again.",
    };
  }

  return { success: "Account created." };
}
