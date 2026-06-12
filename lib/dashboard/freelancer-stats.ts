import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import {
  computeFreelancerInvoiceStats,
  getAllFreelancerInvoices,
} from "./freelancer-invoices";
import {
  computeOpenPayoutsCents,
  getAllFreelancerPayouts,
} from "./freelancer-payouts";
import { getAllFreelancers } from "./freelancers";

export interface FreelancerDashboardStats {
  totalFreelancers: number;
  openFreelancerInvoicesCents: number;
  paidFreelancerInvoicesCents: number;
  openPayoutsCents: number;
}

export async function getFreelancerDashboardStats(): Promise<FreelancerDashboardStats> {
  const profile = await getProfile();
  if (!profile || !canAccessFinanceRoutes(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const [freelancers, invoices, payouts] = await Promise.all([
    getAllFreelancers(),
    getAllFreelancerInvoices(),
    getAllFreelancerPayouts(),
  ]);

  const invoiceStats = computeFreelancerInvoiceStats(invoices);

  return {
    totalFreelancers: freelancers.length,
    openFreelancerInvoicesCents: invoiceStats.openFreelancerInvoicesCents,
    paidFreelancerInvoicesCents: invoiceStats.paidFreelancerInvoicesCents,
    openPayoutsCents: computeOpenPayoutsCents(payouts),
  };
}
