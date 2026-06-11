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
        <table className="dashboard-table w-full min-w-[720px]">
          <thead>
            <tr>
              <th className="text-left">Zeitraum</th>
              <th className="text-right">Kundenumsatz</th>
              <th className="text-right">Freelancer</th>
              <th className="text-right">Provisionen</th>
              <th className="text-right">Agenturkosten</th>
              <th className="text-right">Gewinn</th>
            </tr>
          </thead>
          <tbody>
            {breakdowns.map((row) => (
              <tr key={row.period}>
                <td className="font-medium text-foreground">
                  {PROFIT_PERIOD_LABELS[row.period]}
                </td>
                <td className="text-right">{formatCents(row.customerRevenueCents)}</td>
                <td className="text-right text-red-300">
                  −{formatCents(row.freelancerCostsCents)}
                </td>
                <td className="text-right text-red-300">
                  −{formatCents(row.commissionsCents)}
                </td>
                <td className="text-right text-red-300">
                  −{formatCents(row.agencyCostsCents)}
                </td>
                <td
                  className={`text-right font-semibold ${
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
