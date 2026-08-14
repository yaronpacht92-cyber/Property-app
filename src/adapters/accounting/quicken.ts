import type { AccountingAdapter, AccountingSummary } from "@/adapters/accounting/types";
import { prisma } from "@/lib/db";

/**
 * Quicken has no public third-party OAuth API.
 * Pachtfolio integrates via exported OFX / QFX / QIF / CSV files.
 */
export class QuickenAdapter implements AccountingAdapter {
  name = "quicken-file-import";

  async getConnectionStatus() {
    return "not_configured" as const;
  }

  async getPropertySummary(externalMappingId: string): Promise<AccountingSummary | null> {
    const mapping = await prisma.accountingPropertyMapping.findFirst({
      where: { externalId: externalMappingId },
      include: {
        property: {
          include: {
            financialTransactions: {
              orderBy: { txnDate: "desc" },
              take: 25,
            },
          },
        },
      },
    });
    if (!mapping) return null;

    const txns = mapping.property.financialTransactions;
    const now = new Date();
    const month = now.getUTCMonth();
    const year = now.getUTCFullYear();

    let incomeThisMonth = 0;
    let incomeThisYear = 0;
    let expensesThisMonth = 0;
    let expensesThisYear = 0;
    const categoryTotals = new Map<string, number>();

    for (const txn of txns) {
      const amount = Number(txn.amount);
      const d = txn.txnDate;
      const inYear = d.getUTCFullYear() === year;
      const inMonth = inYear && d.getUTCMonth() === month;
      if (amount >= 0) {
        if (inMonth) incomeThisMonth += amount;
        if (inYear) incomeThisYear += amount;
      } else {
        const expense = Math.abs(amount);
        if (inMonth) expensesThisMonth += expense;
        if (inYear) expensesThisYear += expense;
        const key = txn.category || "Other";
        categoryTotals.set(key, (categoryTotals.get(key) || 0) + expense);
      }
    }

    const majorCategories = Array.from(categoryTotals.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      incomeThisMonth,
      incomeThisYear,
      expensesThisMonth,
      expensesThisYear,
      netOperatingIncome: incomeThisYear - expensesThisYear,
      majorCategories,
      recentTransactions: txns.slice(0, 8).map((txn) => ({
        id: txn.id,
        date: txn.txnDate,
        memo: txn.memo || txn.category || "Transaction",
        amount: Number(txn.amount),
        category: txn.category || "Other",
      })),
      unmatchedCount: txns.filter((txn) => !txn.matched).length,
    };
  }
}
