import type {
  AgencyRole,
  EmploymentType,
  TeamMemberStatus,
  UserRole,
} from "@/lib/auth/types";
import type {
  ContractStatus as TeamContractStatus,
  ContractType as TeamContractType,
} from "./contract-constants";
import type { CommissionEntryStatus } from "./commission-constants";
import type {
  AppointmentStatus,
  BillingCycle,
  ClientActivityType,
  ClientFreelancerPayoutStatus,
  CommissionStatus,
  ContractStatus,
  CommunicationType,
  ExpenseCategory,
  FreelancerInvoiceStatus,
  FreelancerPayoutStatus,
  InvoiceStatus,
  InvoiceType,
  LeadStatus,
  ProfitPeriod,
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
  setter_id: string | null;
  closer_id: string | null;
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
  activeRetainersCount: number;
  retainerRevenueThisMonthCents: number;
  openRetainerInvoicesCents: number;
  overdueRetainerInvoicesCents: number;
  outstandingCommissionsCents: number;
  paidCommissionsCents: number;
  outstandingRetainerPaymentsCents: number;
  totalInvoicedCents: number;
  openInvoicesCents: number;
  paidInvoicesCents: number;
  overdueInvoicesCents: number;
  outstandingInvoiceAmountCents: number;
  openFreelancerInvoicesCents: number;
  paidFreelancerInvoicesCents: number;
  outstandingFreelancerInvoicesCents: number;
  monthlyExpensesCents: number;
  yearlyExpensesCents: number;
  agencyProfitCents: number;
  outstandingClientFreelancerPayoutsCents: number;
  paidClientFreelancerPayoutsCents: number;
  agencyProfitAfterFreelancerPayoutsCents: number;
  freelancerProjectAgencyShareCents: number;
}

export interface FreelancerRecord {
  id: string;
  name: string;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  tax_number: string | null;
  vat_id: string | null;
  iban: string | null;
  bic: string | null;
  default_commission_rate: number;
  is_active: boolean;
  last_payout_at: string | null;
  created_at: string;
  updated_at: string;
  total_earned_cents: number;
  total_paid_out_cents: number;
  outstanding_cents: number;
  assigned_project_count: number;
  assigned_project_names: string[];
  project_volume_cents: number;
  profile_status?: string | null;
  role?: string | null;
}

export interface FreelancerProfileRecord {
  id: string;
  profile_id: string;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  tax_number: string | null;
  vat_id: string | null;
  business_name: string | null;
  invoice_prefix: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientFreelancerPayoutHistoryRecord {
  id: string;
  client_id: string;
  freelancer_id: string;
  amount_cents: number;
  paid_at: string;
  status: string;
  created_at: string;
  client_name?: string;
}

export interface FreelancerProfileInvoiceRecord {
  id: string;
  freelancer_profile_id: string;
  client_id: string;
  payout_id: string | null;
  invoice_number: string;
  amount_cents: number;
  invoice_date: string;
  status: string;
  pdf_url: string | null;
  created_at: string;
  client_name?: string;
}

export interface FreelancerProfileInvoiceWithDetails extends FreelancerProfileInvoiceRecord {
  profile: FreelancerProfileRecord;
  freelancer_name: string;
  freelancer_email: string | null;
  client_name: string;
  business_name: string | null;
}

export interface FreelancerDetailData {
  freelancer: FreelancerRecord;
  billingProfile: FreelancerProfileRecord;
  payouts: ClientFreelancerPayoutHistoryRecord[];
  invoices: FreelancerProfileInvoiceRecord[];
}

export interface FreelancerInvoiceRecord {
  id: string;
  freelancer_id: string;
  invoice_number: string;
  description: string;
  subtotal_cents: number;
  tax_amount_cents: number;
  total_amount_cents: number;
  vat_rate: number;
  status: FreelancerInvoiceStatus;
  due_date: string | null;
  submitted_at: string | null;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  freelancer_name?: string;
}

export interface FreelancerInvoiceWithDetails extends FreelancerInvoiceRecord {
  freelancer: FreelancerRecord;
}

export interface FreelancerPayoutRecord {
  id: string;
  freelancer_id: string;
  amount_cents: number;
  payout_date: string;
  status: FreelancerPayoutStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  freelancer_name?: string;
  project_names: string[];
  project_ids: string[];
}

export interface ExpenseRecord {
  id: string;
  title: string;
  amount_cents: number;
  expense_date: string;
  category: ExpenseCategory;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfitBreakdown {
  period: ProfitPeriod;
  customerRevenueCents: number;
  freelancerCostsCents: number;
  commissionsCents: number;
  agencyCostsCents: number;
  profitCents: number;
}

export interface CommissionPayoutRecord {
  id: string;
  amount_cents: number;
  payout_date: string;
  created_at: string;
}

export interface ClientFreelancerPayoutRecord {
  id: string;
  amount_cents: number;
  paid_at: string;
  created_at: string;
}

export type { RetainerPeriodInvoiceRef, RetainerPeriodStatus } from "./retainer";

export interface RetainerPeriodView {
  period_year: number;
  period_month: number;
  label: string;
  status: import("./retainer").RetainerPeriodStatus;
  isUpcoming: boolean;
}

export interface ClientRevenueRecord {
  id: string;
  company_name: string;
  responsible_member_id: string | null;
  responsible_member_name: string | null;
  monthly_revenue_cents: number | null;
  monthly_retainer_cents: number | null;
  setup_fee_cents: number | null;
  contract_start_date: string | null;
  contract_status: ContractStatus;
  auto_invoice_enabled: boolean;
  total_revenue_cents: number | null;
  setup_revenue_cents: number;
  retainer_revenue_cents: number;
  months_active: number;
  months_paid: number;
  months_open: number;
  next_payment_due: string | null;
  outstanding_retainer_cents: number;
  retainer_periods: RetainerPeriodView[];
  retainer_invoices: import("./retainer").RetainerPeriodInvoiceRef[];
  commission_status: CommissionStatus;
  commission_cents: number;
  commission_total_cents: number;
  commission_paid_cents: number;
  commission_outstanding_cents: number;
  commission_payouts: CommissionPayoutRecord[];
  commission_rate: number;
  setter_id: string | null;
  setter_name: string | null;
  setter_commission_rate: number;
  closer_id: string | null;
  closer_name: string | null;
  closer_commission_rate: number;
  setter_commission_cents: number;
  closer_commission_cents: number;
  sales_agency_revenue_cents: number;
  sales_deal_type: import("./sales-attribution").SalesDealAttributionType | null;
  commission_entry_id: string | null;
  commission_entry_status: import("./commission-constants").CommissionEntryStatus | null;
  setter_commission_paid: boolean;
  closer_commission_paid: boolean;
  assigned_freelancer_id: string | null;
  assigned_freelancer_name: string | null;
  freelancer_commission_rate: number;
  freelancer_payout_cents: number;
  freelancer_paid_cents: number;
  freelancer_outstanding_cents: number;
  freelancer_payout_status: ClientFreelancerPayoutStatus;
  agency_share_cents: number;
  is_project_paid: boolean;
  freelancer_payouts: ClientFreelancerPayoutRecord[];
  currency: string;
  setter_attribution_debug?: import("./lead-attribution").SetterAttributionDebug;
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

export interface PerformanceFreelancerKpis {
  projectsCount: number;
  projectVolumeCents: number;
  earnedCents: number;
  paidCents: number;
  outstandingCents: number;
}

export interface PerformanceMemberRow {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  agencyRole?: string | null;
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
  projectsCount: number;
  projectVolumeCents: number;
  freelancerEarnedCents: number;
  freelancerPaidCents: number;
  freelancerOutstandingCents: number;
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
  viewerIsFreelancer: boolean;
  kpis: PerformanceKpis;
  freelancerKpis: PerformanceFreelancerKpis | null;
  members: PerformanceMemberRow[];
  revenueTrend: PerformanceRevenuePoint[];
  leadsByStatus: PerformanceLeadStatusSlice[];
  commissions: PerformanceCommissionBars;
}

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  /** @deprecated Synced legacy column */
  role: UserRole;
  employment_type: EmploymentType;
  agency_role: AgencyRole;
  status: TeamMemberStatus;
  created_at: string;
  is_active: boolean;
  activated_at: string | null;
  /** @deprecated Synced legacy column */
  commission_rate: number;
  setter_commission_rate: number;
  closer_commission_rate: number;
}

export interface ClientRecord {
  id: string;
  lead_id: string;
  company_name: string;
  customer_number: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  responsible_member_id: string | null;
  setter_id: string | null;
  closer_id: string | null;
  lead_estimated_value_cents: number | null;
  monthly_retainer_cents: number | null;
  one_time_project_value_cents: number | null;
  currency: string;
  created_at: string;
  responsible_member_name: string | null;
  is_archived: boolean;
}

export interface ClientDetailRecord extends ClientRecord {
  monthly_revenue_cents: number | null;
  setup_fee_cents: number | null;
  contract_start_date: string | null;
  contract_status: ContractStatus;
  billing_cycle: BillingCycle;
  next_invoice_date: string | null;
  last_invoice_date: string | null;
  auto_invoice_enabled: boolean;
  total_revenue_cents: number | null;
  commission_status: CommissionStatus;
  commission_total_cents: number;
  commission_paid_cents: number;
  commission_outstanding_cents: number;
  assigned_freelancer_id: string | null;
  assigned_freelancer_name: string | null;
  freelancer_commission_rate: number;
  freelancer_payout_cents: number;
  freelancer_paid_cents: number;
  freelancer_outstanding_cents: number;
  freelancer_payout_status: ClientFreelancerPayoutStatus;
  agency_share_cents: number;
}

export interface ClientNote {
  id: string;
  client_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
}

export interface ClientActivity {
  id: string;
  client_id: string;
  actor_id: string | null;
  activity_type: ClientActivityType;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_name: string | null;
}

export interface ClientCommunication {
  id: string;
  client_id: string;
  author_id: string;
  communication_type: CommunicationType;
  summary: string;
  occurred_at: string;
  created_at: string;
  author_name: string | null;
}

export interface ClientFile {
  id: string;
  client_id: string;
  uploaded_by: string;
  file_name: string;
  storage_path: string;
  file_size_bytes: number;
  mime_type: string;
  created_at: string;
  uploader_name: string | null;
}

export interface InvoiceRecord {
  id: string;
  client_id: string;
  contract_id?: string | null;
  invoice_type?: InvoiceType | null;
  billing_period_year?: number | null;
  billing_period_month?: number | null;
  invoice_number: string;
  amount_cents: number;
  subtotal_cents: number;
  tax_amount_cents: number;
  total_amount_cents: number;
  vat_rate: number;
  status: InvoiceStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  company_name?: string;
  customer_number?: string | null;
}

export interface InvoiceItemRecord {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  sort_order: number;
  created_at: string;
}

export interface InvoiceClientSnapshot {
  id: string;
  company_name: string;
  customer_number: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  currency: string;
}

export interface InvoiceWithDetails extends InvoiceRecord {
  client: InvoiceClientSnapshot;
  items: InvoiceItemRecord[];
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

export interface TeamContractRecord {
  id: string;
  profile_id: string;
  contract_type: TeamContractType;
  status: TeamContractStatus;
  title: string;
  contract_number: string;
  start_date: string | null;
  end_date: string | null;
  monthly_salary_cents: number | null;
  commission_rate: number | null;
  notes: string | null;
  pdf_url: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  profile_name: string;
  profile_email: string;
  profile_agency_role: AgencyRole;
  profile_employment_type: EmploymentType;
  profile_agency_role_label: string;
  profile_employment_type_label: string;
}

export interface ContractWithDetails extends TeamContractRecord {
  profile_street: string | null;
  profile_postal_code: string | null;
  profile_city: string | null;
  profile_country: string | null;
}

export interface TeamMemberDetailData {
  member: TeamMember;
  contracts: TeamContractRecord[];
  commissionSummary: MemberCommissionSummary | null;
}

export interface ContractsDashboardData {
  contracts: TeamContractRecord[];
  stats: {
    active: number;
    draft: number;
    terminated: number;
    expiring: number;
  };
  members: TeamMember[];
}

export interface CommissionEntryRecord {
  id: string;
  client_id: string;
  client_name: string;
  setter_id: string | null;
  setter_name: string | null;
  closer_id: string | null;
  closer_name: string | null;
  project_value_cents: number;
  setter_rate: number;
  closer_rate: number;
  setter_commission_cents: number;
  closer_commission_cents: number;
  status: CommissionEntryStatus;
  deal_type: import("./sales-attribution").SalesDealAttributionType | null;
  triggered_by_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export interface CommissionCenterStats {
  pendingCents: number;
  approvedCents: number;
  paidCents: number;
  totalCostCents: number;
}

export interface CommissionDashboardKpis {
  openCents: number;
  monthCents: number;
  yearCents: number;
  topSetters: { profileId: string; name: string; amountCents: number }[];
  topClosers: { profileId: string; name: string; amountCents: number }[];
}

export interface MemberCommissionSummary {
  earnedCents: number;
  paidCents: number;
  openCents: number;
  entries: CommissionEntryRecord[];
}

export interface CommissionCenterData {
  entries: CommissionEntryRecord[];
  stats: CommissionCenterStats;
}
