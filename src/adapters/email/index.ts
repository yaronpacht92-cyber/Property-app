import { MockEmailAdapter } from "@/adapters/email/mock";
import type { EmailAdapter } from "@/adapters/email/types";

export function getEmailAdapter(): EmailAdapter {
  return new MockEmailAdapter();
}

export type { EmailAdapter } from "@/adapters/email/types";
