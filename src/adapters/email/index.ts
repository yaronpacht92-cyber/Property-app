import { GmailAdapter } from "@/adapters/email/gmail";
import { MicrosoftEmailAdapter } from "@/adapters/email/microsoft";
import { MockEmailAdapter } from "@/adapters/email/mock";
import type { EmailAdapter, EmailProviderId } from "@/adapters/email/types";

export function getEmailAdapter(provider: EmailProviderId = "GMAIL"): EmailAdapter {
  if (provider === "MICROSOFT") {
    return new MicrosoftEmailAdapter();
  }
  return new GmailAdapter();
}

export function getDemoEmailAdapter(): EmailAdapter {
  return new MockEmailAdapter();
}

export function getConfiguredEmailProviders(): EmailProviderId[] {
  const providers: EmailProviderId[] = [];
  if (new GmailAdapter().isConfigured()) providers.push("GMAIL");
  if (new MicrosoftEmailAdapter().isConfigured()) providers.push("MICROSOFT");
  return providers;
}

export type { EmailAdapter, EmailProviderId, MatchedEmail } from "@/adapters/email/types";
