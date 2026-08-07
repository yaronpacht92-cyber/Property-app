import type { AccountingAdapter, AccountingSummary } from "@/adapters/accounting/types";

/** Read-only mock QuickBooks adapter used until OAuth credentials are configured. */
export class MockQuickBooksAdapter implements AccountingAdapter {
  name = "quickbooks-mock";

  async getConnectionStatus() {
    return "not_configured" as const;
  }

  async getPropertySummary(externalMappingId: string): Promise<AccountingSummary> {
    const seed = externalMappingId.length * 1000;
    return {
      incomeThisMonth: 2400 + seed / 100,
      incomeThisYear: 28800 + seed,
      expensesThisMonth: 900 + seed / 200,
      expensesThisYear: 10800 + seed / 2,
      netOperatingIncome: 18000 + seed / 2,
      majorCategories: [
        { name: "Repairs", amount: 3200 },
        { name: "Insurance", amount: 2100 },
        { name: "Property tax", amount: 4500 },
      ],
      recentTransactions: [
        {
          id: "sample-txn-1",
          date: new Date(),
          memo: "Sample rent deposit (mock)",
          amount: 2400,
          category: "Income",
        },
      ],
      unmatchedCount: 1,
    };
  }
}
