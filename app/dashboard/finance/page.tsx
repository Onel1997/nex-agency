import {
  getClientRevenueRecords,
  getFinanceStats,
  getProfitBreakdowns,
} from "@/lib/dashboard/finance";
import { getAllInvoices } from "@/lib/dashboard/invoices";
import type {
  ClientRevenueRecord,
  FinanceStats,
  InvoiceRecord,
  ProfitBreakdown,
} from "@/lib/dashboard/types";
import { FinancePageClient } from "@/components/dashboard/FinancePageClient";

export default async function FinancePage() {
  let stats: FinanceStats = {
    totalRevenueCents: 0,
    monthlyRecurringRevenueCents: 0,
    activeRetainersCount: 0,
    retainerRevenueThisMonthCents: 0,
    openRetainerInvoicesCents: 0,
    overdueRetainerInvoicesCents: 0,
    outstandingCommissionsCents: 0,
    paidCommissionsCents: 0,
    outstandingRetainerPaymentsCents: 0,
    totalInvoicedCents: 0,
    openInvoicesCents: 0,
    paidInvoicesCents: 0,
    overdueInvoicesCents: 0,
    outstandingInvoiceAmountCents: 0,
    openFreelancerInvoicesCents: 0,
    paidFreelancerInvoicesCents: 0,
    outstandingFreelancerInvoicesCents: 0,
    monthlyExpensesCents: 0,
    yearlyExpensesCents: 0,
    agencyProfitCents: 0,
  };
  let clients: ClientRevenueRecord[] = [];
  let invoices: InvoiceRecord[] = [];
  let profitBreakdowns: ProfitBreakdown[] = [];
  let error: string | null = null;

  try {
    const [financeStats, revenueClients, agencyInvoices, profits] =
      await Promise.all([
        getFinanceStats(),
        getClientRevenueRecords(),
        getAllInvoices(),
        getProfitBreakdowns(),
      ]);

    if (financeStats) stats = financeStats;
    clients = revenueClients;
    invoices = agencyInvoices;
    profitBreakdowns = profits;
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

  return (
    <FinancePageClient
      stats={stats}
      clients={clients}
      invoices={invoices}
      profitBreakdowns={profitBreakdowns}
    />
  );
}
