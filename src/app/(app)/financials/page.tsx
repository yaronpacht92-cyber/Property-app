import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission, getPropertyAccessFilter } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

function n(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value.toString());
}

function moneyCell(value: number, blankZero = false) {
  if (blankZero && value === 0) return "—";
  return formatCurrency(value);
}

export default async function FinancialsPage() {
  const session = await requirePermission(PERMISSIONS.FINANCIALS_READ);
  const propertyFilter = await getPropertyAccessFilter(
    session.user.id,
    session.user.organizationId,
    session.user.roleKey,
  );

  const properties = await prisma.property.findMany({
    where: { ...propertyFilter, status: "ACTIVE" },
    include: {
      valuations: { orderBy: { createdAt: "desc" }, take: 1 },
      taxRecords: { orderBy: { createdAt: "desc" }, take: 1 },
      mortgages: { where: { status: "active" }, take: 1 },
      insurancePolicies: {
        where: { deletedAt: null, status: { in: ["ACTIVE", "RENEWAL_COMING_UP"] } },
        take: 3,
      },
    },
    orderBy: { nickname: "asc" },
  });

  const rows = properties.map((property) => {
    const estimatedValue = n(property.valuations[0]?.estimatedValue);
    const assessedValue = n(property.taxRecords[0]?.assessedValue);
    const annualTax = n(property.taxRecords[0]?.annualTax);
    const monthlyRent = n(property.monthlyRent);
    const annualRent = monthlyRent * 12;
    const monthlyMortgage = n(property.mortgages[0]?.monthlyPayment);
    const annualMortgage = monthlyMortgage * 12;
    const annualInsurance = property.insurancePolicies.reduce(
      (sum, policy) => sum + n(policy.premium),
      0,
    );
    const monthlyManagementFee = n(property.monthlyManagementFee);
    const annualManagementFee = monthlyManagementFee * 12;
    const monthlyOther = n(property.otherMonthlyExpenses);
    const annualOther = monthlyOther * 12;
    const annualFixedExpenses =
      annualTax + annualInsurance + annualManagementFee + annualOther + annualMortgage;
    const noi =
      annualRent - annualTax - annualInsurance - annualManagementFee - annualOther;
    const cashFlow = noi - annualMortgage;

    return {
      id: property.id,
      nickname: property.nickname,
      isSampleData: property.isSampleData,
      estimatedValue,
      assessedValue,
      monthlyRent,
      annualRent,
      annualTax,
      annualInsurance,
      monthlyMortgage,
      annualMortgage,
      monthlyManagementFee,
      annualManagementFee,
      monthlyOther,
      annualOther,
      annualFixedExpenses,
      noi,
      cashFlow,
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.estimatedValue += row.estimatedValue;
      acc.assessedValue += row.assessedValue;
      acc.monthlyRent += row.monthlyRent;
      acc.annualRent += row.annualRent;
      acc.annualTax += row.annualTax;
      acc.annualInsurance += row.annualInsurance;
      acc.annualMortgage += row.annualMortgage;
      acc.annualManagementFee += row.annualManagementFee;
      acc.annualOther += row.annualOther;
      acc.annualFixedExpenses += row.annualFixedExpenses;
      acc.noi += row.noi;
      acc.cashFlow += row.cashFlow;
      return acc;
    },
    {
      estimatedValue: 0,
      assessedValue: 0,
      monthlyRent: 0,
      annualRent: 0,
      annualTax: 0,
      annualInsurance: 0,
      annualMortgage: 0,
      annualManagementFee: 0,
      annualOther: 0,
      annualFixedExpenses: 0,
      noi: 0,
      cashFlow: 0,
    },
  );

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-4xl font-semibold md:text-5xl">Portfolio P&amp;L</h1>
        <p className="mt-2 max-w-3xl text-xl text-[var(--muted-foreground)]">
          Aggregate estimated values, rents, taxes, and fixed expenses across your active
          properties.
        </p>
      </div>

      <Alert tone="info" title="How these numbers are calculated">
        Totals use the latest values entered for each property. Rent, mortgage, management fees,
        and other fixed costs are treated as monthly and multiplied by 12. Property taxes and
        insurance premiums are treated as annual. This is a planning summary, not a tax return or
        audited statement.
      </Alert>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Estimated portfolio value"
          value={moneyCell(totals.estimatedValue)}
          hint={`${rows.length} active propert${rows.length === 1 ? "y" : "ies"}`}
        />
        <SummaryCard
          label="Assessed value"
          value={moneyCell(totals.assessedValue)}
          hint="Latest assessor / tax records"
        />
        <SummaryCard
          label="Gross annual rent"
          value={moneyCell(totals.annualRent)}
          hint={`${moneyCell(totals.monthlyRent)} / month`}
        />
        <SummaryCard
          label="Annual cash flow"
          value={moneyCell(totals.cashFlow)}
          hint="Rent − taxes − insurance − fees − mortgage"
          tone={totals.cashFlow >= 0 ? "positive" : "negative"}
        />
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-3xl font-semibold">Annual operating summary</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-lg">
            <tbody>
              <Row label="Gross rental income" value={totals.annualRent} strong />
              <Spacer />
              <Row label="Property taxes" value={-totals.annualTax} />
              <Row label="Insurance premiums" value={-totals.annualInsurance} />
              <Row label="Property management fees" value={-totals.annualManagementFee} />
              <Row label="Other fixed expenses" value={-totals.annualOther} />
              <Row
                label="Net operating income (before mortgage)"
                value={totals.noi}
                strong
                divider
              />
              <Row label="Mortgage payments" value={-totals.annualMortgage} />
              <Row
                label="Cash flow after mortgage"
                value={totals.cashFlow}
                strong
                divider
                tone={totals.cashFlow >= 0 ? "positive" : "negative"}
              />
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-3xl font-semibold">By property</h2>
        <p className="mt-2 text-base text-[var(--muted-foreground)]">
          Open a property to update rent, taxes, mortgage, insurance, management fees, or other
          fixed costs.
        </p>
        {rows.length === 0 ? (
          <p className="mt-6 text-lg">No active properties yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[64rem] border-collapse text-left text-base md:text-lg">
              <thead>
                <tr className="border-b-2 border-[var(--border-strong)]">
                  <th className="py-3 pr-4 font-semibold">Property</th>
                  <th className="py-3 pr-4 font-semibold">Est. value</th>
                  <th className="py-3 pr-4 font-semibold">Annual rent</th>
                  <th className="py-3 pr-4 font-semibold">Taxes</th>
                  <th className="py-3 pr-4 font-semibold">Insurance</th>
                  <th className="py-3 pr-4 font-semibold">Mgmt fees</th>
                  <th className="py-3 pr-4 font-semibold">Other</th>
                  <th className="py-3 pr-4 font-semibold">Mortgage</th>
                  <th className="py-3 font-semibold">Cash flow</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--border)]">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/properties/${row.id}`}
                        className="font-semibold text-[var(--primary)] hover:underline"
                      >
                        {row.nickname}
                      </Link>
                      {row.isSampleData ? (
                        <Badge tone="info" className="ml-2">
                          Sample
                        </Badge>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{moneyCell(row.estimatedValue, true)}</td>
                    <td className="py-3 pr-4 tabular-nums">{moneyCell(row.annualRent, true)}</td>
                    <td className="py-3 pr-4 tabular-nums">{moneyCell(row.annualTax, true)}</td>
                    <td className="py-3 pr-4 tabular-nums">
                      {moneyCell(row.annualInsurance, true)}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {moneyCell(row.annualManagementFee, true)}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{moneyCell(row.annualOther, true)}</td>
                    <td className="py-3 pr-4 tabular-nums">
                      {moneyCell(row.annualMortgage, true)}
                    </td>
                    <td
                      className={`py-3 font-semibold tabular-nums ${
                        row.cashFlow < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
                      }`}
                    >
                      {moneyCell(row.cashFlow)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-[var(--border-strong)] bg-[var(--muted)]">
                  <td className="py-3 pr-4 font-semibold">Portfolio total</td>
                  <td className="py-3 pr-4 font-semibold tabular-nums">
                    {moneyCell(totals.estimatedValue)}
                  </td>
                  <td className="py-3 pr-4 font-semibold tabular-nums">
                    {moneyCell(totals.annualRent)}
                  </td>
                  <td className="py-3 pr-4 font-semibold tabular-nums">
                    {moneyCell(totals.annualTax)}
                  </td>
                  <td className="py-3 pr-4 font-semibold tabular-nums">
                    {moneyCell(totals.annualInsurance)}
                  </td>
                  <td className="py-3 pr-4 font-semibold tabular-nums">
                    {moneyCell(totals.annualManagementFee)}
                  </td>
                  <td className="py-3 pr-4 font-semibold tabular-nums">
                    {moneyCell(totals.annualOther)}
                  </td>
                  <td className="py-3 pr-4 font-semibold tabular-nums">
                    {moneyCell(totals.annualMortgage)}
                  </td>
                  <td
                    className={`py-3 font-semibold tabular-nums ${
                      totals.cashFlow < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
                    }`}
                  >
                    {moneyCell(totals.cashFlow)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "positive" | "negative";
}) {
  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-base font-semibold text-[var(--muted-foreground)]">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold tabular-nums ${
          tone === "negative"
            ? "text-[var(--danger)]"
            : tone === "positive"
              ? "text-[var(--success)]"
              : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-base text-[var(--muted-foreground)]">{hint}</p>
    </article>
  );
}

function Spacer() {
  return (
    <tr>
      <td colSpan={2} className="h-3" />
    </tr>
  );
}

function Row({
  label,
  value,
  strong,
  divider,
  tone,
}: {
  label: string;
  value: number;
  strong?: boolean;
  divider?: boolean;
  tone?: "positive" | "negative";
}) {
  const display =
    value < 0 ? `(${formatCurrency(Math.abs(value))})` : formatCurrency(value);
  return (
    <tr className={divider ? "border-t-2 border-[var(--border-strong)]" : undefined}>
      <td className={`py-2 pr-6 ${strong ? "font-semibold" : ""}`}>{label}</td>
      <td
        className={`py-2 text-right tabular-nums ${strong ? "font-semibold" : ""} ${
          tone === "negative"
            ? "text-[var(--danger)]"
            : tone === "positive"
              ? "text-[var(--success)]"
              : value < 0
                ? "text-[var(--muted-foreground)]"
                : ""
        }`}
      >
        {display}
      </td>
    </tr>
  );
}
