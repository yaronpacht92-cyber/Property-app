import { NextResponse } from "next/server";
import { getEmailAdapter } from "@/adapters/email";
import { appBaseUrl } from "@/adapters/email/env";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { parseOAuthState } from "@/lib/oauth-state";
import { sealTokens } from "@/lib/token-vault";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const base = appBaseUrl();

  if (oauthError) {
    return NextResponse.redirect(
      `${base}/settings/integrations?emailError=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${base}/settings/integrations?emailError=${encodeURIComponent("Missing OAuth code.")}`,
    );
  }

  try {
    const payload = parseOAuthState(state);
    if (payload.provider !== "MICROSOFT") {
      throw new Error("OAuth state provider mismatch.");
    }

    const adapter = getEmailAdapter("MICROSOFT");
    const tokens = await adapter.exchangeCode(code);
    const vaultRef = sealTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
    });

    const existing = await prisma.emailConnection.findFirst({
      where: { organizationId: payload.organizationId, provider: "MICROSOFT" },
    });

    const connection = existing
      ? await prisma.emailConnection.update({
          where: { id: existing.id },
          data: {
            status: "CONNECTED",
            accountEmail: tokens.accountEmail,
            tokenVaultRef: vaultRef,
            lastError: null,
          },
        })
      : await prisma.emailConnection.create({
          data: {
            organizationId: payload.organizationId,
            provider: "MICROSOFT",
            status: "CONNECTED",
            accountEmail: tokens.accountEmail,
            tokenVaultRef: vaultRef,
            lastError: null,
          },
        });

    await writeAuditLog({
      organizationId: payload.organizationId,
      actorUserId: payload.userId,
      action: "email.connected",
      entityType: "EmailConnection",
      entityId: connection.id,
      summary: `Connected Microsoft mail (${tokens.accountEmail})`,
    });

    return NextResponse.redirect(
      `${base}/settings/integrations?emailConnected=microsoft&connectionId=${connection.id}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Microsoft connection failed.";
    return NextResponse.redirect(
      `${base}/settings/integrations?emailError=${encodeURIComponent(message)}`,
    );
  }
}
