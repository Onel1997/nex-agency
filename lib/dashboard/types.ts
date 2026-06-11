import type { TeamMemberStatus, UserRole } from "@/lib/auth/types";
import type {
  AppointmentStatus,
  CommissionStatus,
  LeadStatus,
} from "./constants";

export interface Lead {
  id: string;
  created_at: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: LeadStatus;
  acquired_by: string | null;
  owner_id: string | null;
  created_by: string;
  estimated_value_cents: number | null;
  currency: string;
  notes: string | null;
  converted_to_client: boolean;
  owner_name?: string | null;
  creator_name?: string | null;
}

export type LeadInsert = Omit<
  Lead,
  "id" | "created_at" | "owner_name" | "creator_name"
>;
export type LeadUpdate = Partial<LeadInsert>;

export interface DashboardStats {
  leadsCount: number;
  appointmentsCount: number;
  clientsCount: number;
  pipelineCount: number;
  pipelineValueCents: number;
  teamCount?: number;
}

export interface AppointmentStats {
  todayCount: number;
  weekCount: number;
  confirmedCount: number;
  completedCount: number;
}

export interface TeamMemberStats {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  leadsCount: number;
  appointmentsCount: number;
  clientsCount: number;
  pipelineValueCents: number;
}

export interface FinanceStats {
  totalRevenueCents: number;
  monthlyRecurringRevenueCents: number;
  outstandingCommissionsCents: number;
  paidCommissionsCents: number;
  outstandingRetainerPaymentsCents: number;
}

export interface CommissionPayoutRecord {
  id: string;
  amount_cents: number;
  payout_date: string;
  created_at: string;
}

export interface RetainerPeriodView {
  period_year: number;
  period_month: number;
  label: string;
  status: "paid" | "open";
  isUpcoming: boolean;
}

export interface ClientRevenueRecord {
  id: string;
  company_name: string;
  responsible_member_id: string | null;
  responsible_member_name: string | null;
  monthly_revenue_cents: number | null;
  setup_fee_cents: number | null;
  contract_start_date: string | null;
  total_revenue_cents: number | null;
  setup_revenue_cents: number;
  retainer_revenue_cents: number;
  months_active: number;
  months_paid: number;
  months_open: number;
  next_payment_due: string | null;
  outstanding_retainer_cents: number;
  retainer_periods: RetainerPeriodView[];
  commission_status: CommissionStatus;
  commission_cents: number;
  commission_total_cents: number;
  commission_paid_cents: number;
  commission_outstanding_cents: number;
  commission_payouts: CommissionPayoutRecord[];
  commission_rate: number;
  currency: string;
}

export interface TeamPerformanceStats {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  commissionRate: number;
  leadsCreated: number;
  leadsWon: number;
  clientsOwned: number;
  setupRevenueCents: number;
  retainerRevenueCents: number;
  revenueGeneratedCents: number;
  commissionsTotalCents: number;
  commissionsPaidCents: number;
  commissionsOutstandingCents: number;
}

export interface PerformanceKpis {
  totalLeads: number;
  wonLeads: number;
  conversionRate: number;
  totalRevenueCents: number;
  outstandingCommissionsCents: number;
  paidCommissionsCents: number;
  appointmentsCount: number;
}

export interface PerformanceMemberRow {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  commissionRate: number;
  leadsCount: number;
  leadsWon: number;
  clientsCount: number;
  revenueCents: number;
  commissionTotalCents: number;
  commissionPaidCents: number;
  commissionOutstandingCents: number;
  appointmentsCount: number;
  conversionRate: number;
}

export interface PerformanceRevenuePoint {
  label: string;
  revenueCents: number;
}

export interface PerformanceLeadStatusSlice {
  status: string;
  label: string;
  count: number;
}

export interface PerformanceCommissionBars {
  outstandingCents: number;
  paidCents: number;
}

export interface PerformanceDashboardData {
  period: import("./performance-period").PerformancePeriod;
  isTeamView: boolean;
  kpis: PerformanceKpis;
  members: PerformanceMemberRow[];
  revenueTrend: PerformanceRevenuePoint[];
  leadsByStatus: PerformanceLeadStatusSlice[];
  commissions: PerformanceCommissionBars;
}

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: TeamMemberStatus;
  created_at: string;
  is_active: boolean;
  activated_at: string | null;
  commission_rate: number;
}

export interface ClientRecord {
  id: string;
  lead_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  responsible_member_id: string | null;
  contract_value_cents: number | null;
  monthly_retainer_cents: number | null;
  one_time_project_value_cents: number | null;
  currency: string;
  created_at: string;
  responsible_member_name: string | null;
}

export interface AppointmentRow extends Lead {
  assignee_name: string | null;
}

export interface Appointment {
  id: string;
  title: string;
  description: string | null;
  lead_id: string | null;
  assigned_user_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
  assignee_name?: string | null;
  lead_company_name?: string | null;
}
