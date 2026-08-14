import { QuickenAdapter } from "@/adapters/accounting/quicken";
import type { AccountingAdapter } from "@/adapters/accounting/types";

export function getAccountingAdapter(): AccountingAdapter {
  return new QuickenAdapter();
}

export type { AccountingAdapter, AccountingSummary } from "@/adapters/accounting/types";
