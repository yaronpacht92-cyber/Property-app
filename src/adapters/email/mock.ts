import type { EmailAdapter } from "@/adapters/email/types";

export class MockEmailAdapter implements EmailAdapter {
  name = "email-mock";
  provider: "GMAIL" | "MICROSOFT" = "GMAIL";

  async getConnectionStatus() {
    return "not_configured" as const;
  }

  async searchPropertyEmails(keywords: string[]) {
    if (!keywords.length) return [];
    return [
      {
        externalThreadId: "sample-thread-1",
        subject: `Sample: Update about ${keywords[0]}`,
        snippet: "This is sample email data shown when Gmail/Outlook is not connected.",
        sender: "manager@example.com",
        receivedAt: new Date(),
        category: "PROPERTY_MANAGER",
        hasAttachment: false,
        providerUrl: "https://mail.google.com",
      },
    ];
  }
}
