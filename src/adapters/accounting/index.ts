import { MockQuickBooksAdapter } from "@/adapters/accounting/mock-quickbooks";
import type { AccountingAdapter } from "@/adapters/accounting/types";

export function getAccountingAdapter(): AccountingAdapter {
  // Real QuickBooks OAuth adapter replaces this when credentials exist.
  return new MockQuickBooksAdapter();
}

export type { AccountingAdapter } from "@/adapters/accounting/types";
