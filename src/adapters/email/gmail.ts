import { categorizeEmail } from "@/adapters/email/category";
import { gmailConfig } from "@/adapters/email/env";
import type { EmailAdapter, MatchedEmail, OAuthTokenSet } from "@/adapters/email/types";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.readonly"].join(" ");

type GmailMessageList = { messages?: Array<{ id: string; threadId: string }> };
type GmailMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
};

function header(headers: Array<{ name: string; value: string }> | undefined, name: string) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

async function parseJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${label} failed (${response.status}): ${text.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

export class GmailAdapter implements EmailAdapter {
  name = "gmail";
  provider = "GMAIL" as const;

  isConfigured() {
    return gmailConfig().configured;
  }

  getAuthorizeUrl(state: string) {
    const { clientId, redirectUri } = gmailConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    const { clientId, clientSecret, redirectUri } = gmailConfig();
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const token = await parseJson<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
    }>(response, "Gmail token exchange");

    if (!token.refresh_token) {
      throw new Error(
        "Google did not return a refresh token. Disconnect the app from your Google account and try again.",
      );
    }

    const profileResponse = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await parseJson<{ email?: string }>(profileResponse, "Gmail userinfo");

    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      scope: token.scope,
      accountEmail: profile.email || "unknown@gmail.com",
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const { clientId, clientSecret } = gmailConfig();
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const token = await parseJson<{
      access_token: string;
      expires_in: number;
      scope?: string;
    }>(response, "Gmail token refresh");

    return {
      accessToken: token.access_token,
      refreshToken,
      expiresAt: Date.now() + token.expires_in * 1000,
      scope: token.scope,
    };
  }

  async listRecentEmails(accessToken: string, options?: { maxResults?: number }): Promise<MatchedEmail[]> {
    const maxResults = Math.min(options?.maxResults ?? 40, 50);
    const listUrl = new URL(`${GMAIL_API}/users/me/messages`);
    listUrl.searchParams.set("maxResults", String(maxResults));
    listUrl.searchParams.set("q", "newer_than:60d");

    const listResponse = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const list = await parseJson<GmailMessageList>(listResponse, "Gmail message list");
    const messages = list.messages || [];

    const results: MatchedEmail[] = [];
    for (const item of messages) {
      const detailResponse = await fetch(
        `${GMAIL_API}/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!detailResponse.ok) continue;
      const detail = (await detailResponse.json()) as GmailMessage;
      const subject = header(detail.payload?.headers, "Subject") || "(no subject)";
      const sender = header(detail.payload?.headers, "From") || "unknown";
      const snippet = detail.snippet || "";
      const receivedAt = detail.internalDate
        ? new Date(Number(detail.internalDate))
        : new Date();
      const threadId = detail.threadId || detail.id;
      results.push({
        externalThreadId: threadId,
        subject,
        snippet,
        sender,
        receivedAt,
        category: categorizeEmail(subject, snippet, sender),
        hasAttachment: Boolean(detail.labelIds?.includes("HAS_ATTACHMENT")),
        providerUrl: `https://mail.google.com/mail/u/0/#inbox/${threadId}`,
      });
    }

    // Deduplicate by thread (keep newest)
    const byThread = new Map<string, MatchedEmail>();
    for (const email of results) {
      const existing = byThread.get(email.externalThreadId);
      if (!existing || email.receivedAt > existing.receivedAt) {
        byThread.set(email.externalThreadId, email);
      }
    }
    return Array.from(byThread.values()).sort(
      (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime(),
    );
  }
}
