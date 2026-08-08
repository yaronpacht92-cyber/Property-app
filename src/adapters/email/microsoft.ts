import { categorizeEmail } from "@/adapters/email/category";
import { microsoftConfig } from "@/adapters/email/env";
import type { EmailAdapter, MatchedEmail, OAuthTokenSet } from "@/adapters/email/types";

const SCOPES = ["offline_access", "User.Read", "Mail.Read"].join(" ");
const GRAPH = "https://graph.microsoft.com/v1.0";

type GraphMessage = {
  id: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime?: string;
  hasAttachments?: boolean;
  webLink?: string;
  from?: { emailAddress?: { address?: string; name?: string } };
};

async function parseJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${label} failed (${response.status}): ${text.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

export class MicrosoftEmailAdapter implements EmailAdapter {
  name = "microsoft-graph";
  provider = "MICROSOFT" as const;

  isConfigured() {
    return microsoftConfig().configured;
  }

  private authBase() {
    const { tenant } = microsoftConfig();
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`;
  }

  getAuthorizeUrl(state: string) {
    const { clientId, redirectUri } = microsoftConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: SCOPES,
      state,
    });
    return `${this.authBase()}/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    const { clientId, clientSecret, redirectUri } = microsoftConfig();
    const response = await fetch(`${this.authBase()}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: SCOPES,
      }),
    });
    const token = await parseJson<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
    }>(response, "Microsoft token exchange");

    if (!token.refresh_token) {
      throw new Error("Microsoft did not return a refresh token. Please try connecting again.");
    }

    const meResponse = await fetch(`${GRAPH}/me?$select=mail,userPrincipalName`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const me = await parseJson<{ mail?: string; userPrincipalName?: string }>(
      meResponse,
      "Microsoft profile",
    );

    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      scope: token.scope,
      accountEmail: me.mail || me.userPrincipalName || "unknown@outlook.com",
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const { clientId, clientSecret } = microsoftConfig();
    const response = await fetch(`${this.authBase()}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: SCOPES,
      }),
    });
    const token = await parseJson<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
    }>(response, "Microsoft token refresh");

    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token || refreshToken,
      expiresAt: Date.now() + token.expires_in * 1000,
      scope: token.scope,
    };
  }

  async listRecentEmails(accessToken: string, options?: { maxResults?: number }): Promise<MatchedEmail[]> {
    const top = Math.min(options?.maxResults ?? 40, 50);
    const url = new URL(`${GRAPH}/me/messages`);
    url.searchParams.set("$top", String(top));
    url.searchParams.set(
      "$select",
      "id,conversationId,subject,bodyPreview,receivedDateTime,hasAttachments,webLink,from",
    );
    url.searchParams.set("$orderby", "receivedDateTime desc");

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await parseJson<{ value?: GraphMessage[] }>(response, "Microsoft mail list");
    const messages = payload.value || [];

    const byThread = new Map<string, MatchedEmail>();
    for (const message of messages) {
      const subject = message.subject || "(no subject)";
      const snippet = message.bodyPreview || "";
      const sender =
        message.from?.emailAddress?.address ||
        message.from?.emailAddress?.name ||
        "unknown";
      const receivedAt = message.receivedDateTime
        ? new Date(message.receivedDateTime)
        : new Date();
      const externalThreadId = message.conversationId || message.id;
      const email: MatchedEmail = {
        externalThreadId,
        subject,
        snippet,
        sender,
        receivedAt,
        category: categorizeEmail(subject, snippet, sender),
        hasAttachment: Boolean(message.hasAttachments),
        providerUrl: message.webLink || "https://outlook.office.com/mail/",
      };
      const existing = byThread.get(externalThreadId);
      if (!existing || email.receivedAt > existing.receivedAt) {
        byThread.set(externalThreadId, email);
      }
    }

    return Array.from(byThread.values()).sort(
      (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime(),
    );
  }
}
