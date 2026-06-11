import { requireFinanceAccess } from "@/lib/auth/session";
import {
  getClientRevenueRecords,
  getFinanceStats,
} from "@/lib/dashboard/finance";
import type { ClientRevenueRecord, FinanceStats } from "@/lib/dashboard/types";
import { FinancePageClient } from "@/components/dashboard/FinancePageClient";

export default async function FinancePage() {
  await requireFinanceAccess();

  let stats: FinanceStats = {
    totalRevenueCents: 0,
    monthlyRecurringRevenueCents: 0,
    outstandingCommissionsCents: 0,
    paidCommissionsCents: 0,
    outstandingRetainerPaymentsCents: 0,
    totalInvoicedCents: 0,
    openInvoicesCents: 0,
    paidInvoicesCents: 0,
    overdueInvoicesCents: 0,
  };
  let clients: ClientRevenueRecord[] = [];
  let error: string | null = null;

  try {
    const [financeStats, revenueClients] = await Promise.all([
      getFinanceStats(),
      getClientRevenueRecords(),
    ]);

    if (financeStats) stats = financeStats;
    clients = revenueClients;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Finanzdaten konnten nicht geladen werden";
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error}
      </div>
    );
  }

  return <FinancePageClient stats={stats} clients={clients} />;
}
