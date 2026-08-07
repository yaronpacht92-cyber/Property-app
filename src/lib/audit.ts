import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashForAudit } from "@/lib/crypto";

type AuditInput = {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
};

/** Append-only audit log. Never store financial amounts or secrets in metadata. */
export async function writeAuditLog(input: AuditInput) {
  const safeMetadata = sanitizeMetadata(input.metadata ?? {});
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      metadata: safeMetadata as Prisma.InputJsonValue,
      ipHash: input.ipAddress ? hashForAudit(input.ipAddress) : null,
    },
  });
}

const BLOCKED_KEYS = [
  "password",
  "token",
  "secret",
  "ssn",
  "taxid",
  "accountnumber",
  "premium",
  "payment",
  "amount",
  "price",
  "value",
];

function sanitizeMetadata(metadata: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lower = key.toLowerCase();
    if (BLOCKED_KEYS.some((blocked) => lower.includes(blocked))) {
      result[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
    } else if (value === null) {
      result[key] = null;
    } else {
      result[key] = "[omitted]";
    }
  }
  return result;
}
