-- Manual fixed operating expenses for portfolio P&L.
ALTER TABLE "Property"
  ADD COLUMN IF NOT EXISTS "monthlyManagementFee" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "otherMonthlyExpenses" DECIMAL(14,2);
