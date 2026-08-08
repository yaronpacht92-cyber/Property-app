export type EmailProviderId = "GMAIL" | "MICROSOFT";

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

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
  accountEmail: string;
};

export interface EmailAdapter {
  name: string;
  provider: EmailProviderId;
  isConfigured(): boolean;
  getAuthorizeUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthTokenSet>;
  refreshAccessToken(refreshToken: string): Promise<Omit<OAuthTokenSet, "accountEmail"> & { accountEmail?: string }>;
  listRecentEmails(accessToken: string, options?: { maxResults?: number }): Promise<MatchedEmail[]>;
}
