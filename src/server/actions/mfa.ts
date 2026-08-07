"use server";

import { generateSecret, generateURI, verify as verifyTotp } from "otplib";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function beginMfaSetupAction() {
  const session = await requireSession();
  const secret = generateSecret();
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      mfaSecretEnc: encryptSecret(secret),
      mfaEnabled: false,
    },
  });

  const otpauthUri = generateURI({
    issuer: "Homefolio",
    label: session.user.email || session.user.name || "user",
    secret,
  });

  return { otpauthUri };
}

export async function confirmMfaSetupAction(formData: FormData) {
  const session = await requireSession();
  const code = String(formData.get("code") ?? "");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.mfaSecretEnc) {
    return { error: "Please start two-step verification again." };
  }

  const secret = decryptSecret(user.mfaSecretEnc);
  const result = await verifyTotp({ token: code, secret });
  if (!result.valid) {
    return { error: "That security code was not correct. Please try again." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabled: true },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "user.mfa_enabled",
    entityType: "User",
    entityId: user.id,
    summary: "Enabled two-step verification",
  });

  revalidatePath("/settings/security");
  return { success: "Two-step verification is now on." };
}
