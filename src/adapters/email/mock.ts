import { categorizeEmail } from "@/adapters/email/category";
import type { EmailAdapter, MatchedEmail, OAuthTokenSet } from "@/adapters/email/types";

/** Local-only adapter used for demo sync when OAuth apps are not configured. */
export class MockEmailAdapter implements EmailAdapter {
  name = "email-mock";
  provider: "GMAIL" | "MICROSOFT" = "GMAIL";

  isConfigured() {
    return true;
  }

  getAuthorizeUrl(_state: string): string {
    throw new Error("Mock email adapter does not support OAuth authorize.");
  }

  async exchangeCode(): Promise<OAuthTokenSet> {
    throw new Error("Mock email adapter does not support OAuth exchange.");
  }

  async refreshAccessToken(refreshToken: string) {
    return {
      accessToken: "demo-access",
      refreshToken,
      expiresAt: Date.now() + 60 * 60 * 1000,
      scope: "demo",
    };
  }

  async listRecentEmails(_accessToken: string, options?: { maxResults?: number }): Promise<MatchedEmail[]> {
    const max = options?.maxResults ?? 10;
    const now = Date.now();
    const samples: MatchedEmail[] = [
      {
        externalThreadId: `demo-thread-${now}-1`,
        subject: "Property manager update",
        snippet: "Quick update about the unit and upcoming inspection.",
        sender: "manager@example.com",
        receivedAt: new Date(now - 1000 * 60 * 60 * 5),
        category: categorizeEmail("Property manager update", "upcoming inspection", "manager@example.com"),
        hasAttachment: false,
        providerUrl: "https://mail.google.com",
      },
      {
        externalThreadId: `demo-thread-${now}-2`,
        subject: "Insurance renewal reminder",
        snippet: "Your policy renewal window opens next month.",
        sender: "renewals@insure.example",
        receivedAt: new Date(now - 1000 * 60 * 60 * 26),
        category: categorizeEmail(
          "Insurance renewal reminder",
          "policy renewal",
          "renewals@insure.example",
        ),
        hasAttachment: true,
        providerUrl: "https://mail.google.com",
      },
      {
        externalThreadId: `demo-thread-${now}-3`,
        subject: "Maintenance estimate for water heater",
        snippet: "Attached is the warranty and repair estimate.",
        sender: "jobs@reliable.example",
        receivedAt: new Date(now - 1000 * 60 * 60 * 50),
        category: categorizeEmail(
          "Maintenance estimate for water heater",
          "warranty and repair estimate",
          "jobs@reliable.example",
        ),
        hasAttachment: true,
        providerUrl: "https://mail.google.com",
      },
    ];
    return samples.slice(0, max);
  }
}
