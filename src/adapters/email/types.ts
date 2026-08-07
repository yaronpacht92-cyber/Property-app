export type MatchedEmail = {
  externalThreadId: string;
  subject: string;
  snippet: string;
  sender: string;
  receivedAt: Date;
  category: string;
  hasAttachment: boolean;
  providerUrl: string;
};

export interface EmailAdapter {
  name: string;
  provider: "GMAIL" | "MICROSOFT";
  getConnectionStatus(): Promise<"connected" | "disconnected" | "error" | "not_configured">;
  searchPropertyEmails(keywords: string[]): Promise<MatchedEmail[]>;
}
