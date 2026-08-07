export type AccountingSummary = {
  incomeThisMonth: number;
  incomeThisYear: number;
  expensesThisMonth: number;
  expensesThisYear: number;
  netOperatingIncome: number;
  majorCategories: { name: string; amount: number }[];
  recentTransactions: {
    id: string;
    date: Date;
    memo: string;
    amount: number;
    category: string;
  }[];
  unmatchedCount: number;
};

export interface AccountingAdapter {
  name: string;
  getConnectionStatus(): Promise<"connected" | "disconnected" | "error" | "not_configured">;
  getPropertySummary(externalMappingId: string): Promise<AccountingSummary | null>;
  startOAuth?(): Promise<{ url: string }>;
  sync?(connectionId: string): Promise<{ processed: number; status: "success" | "failed" }>;
}
