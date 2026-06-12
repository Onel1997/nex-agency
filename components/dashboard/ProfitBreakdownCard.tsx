import { formatCents } from "@/lib/dashboard/format";
import { PROFIT_PERIOD_LABELS } from "@/lib/dashboard/constants";
import type { ProfitBreakdown } from "@/lib/dashboard/types";

interface ProfitBreakdownCardProps {
  breakdowns: ProfitBreakdown[];
}

export function ProfitBreakdownCard({ breakdowns }: ProfitBreakdownCardProps) {
  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="dashboard-table w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-border">
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-soft">
                Zeitraum
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-muted-soft">
                Kundenumsatz
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-muted-soft">
                Freelancer
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-muted-soft">
                Provisionen
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-muted-soft">
                Agenturkosten
              </th>
              <th className="bg-violet-500/5 px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-violet-200">
                Gewinn
              </th>
            </tr>
          </thead>
          <tbody>
            {breakdowns.map((row) => (
              <tr key={row.period} className="border-b border-border/60 last:border-0">
                <td className="px-6 py-5 font-medium text-foreground">
                  {PROFIT_PERIOD_LABELS[row.period]}
                </td>
                <td className="px-6 py-5 text-right text-foreground">
                  {formatCents(row.customerRevenueCents)}
                </td>
                <td className="px-6 py-5 text-right text-red-300/90">
                  −{formatCents(row.freelancerCostsCents)}
                </td>
                <td className="px-6 py-5 text-right text-red-300/90">
                  −{formatCents(row.commissionsCents)}
                </td>
                <td className="px-6 py-5 text-right text-red-300/90">
                  −{formatCents(row.agencyCostsCents)}
                </td>
                <td
                  className={`bg-violet-500/5 px-6 py-5 text-right text-base font-semibold ${
                    row.profitCents >= 0 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {formatCents(row.profitCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
