import type { AgencyRole, EmploymentType } from "@/lib/auth/types";
import { getAgencyRoleLabel, getEmploymentTypeLabel } from "@/lib/auth/roles";
import {
  CONTRACT_STATUSES,
  CONTRACT_TYPES,
  resolveContractCategory,
  type ContractCategory,
  type ContractStatus,
  type ContractType,
} from "./contract-constants";
import { isContractStatus } from "./contract-numbers";

export interface CreateContractInput {
  profileId: string;
  contractType: ContractType;
  contractCategory: ContractCategory;
  status: ContractStatus;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  monthlySalaryCents?: number | null;
  commissionRate?: number | null;
  agencyRole?: AgencyRole | null;
  workingHoursPerWeek?: number | null;
  vacationDaysPerYear?: number | null;
  setupCommissionRate?: number | null;
  retainerCommissionRate?: number | null;
  retainerCommissionMonths?: number | null;
  notes?: string | null;
}

function formatProfileName(profile: {
  full_name: string | null;
  email: string;
}): string {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

function parseOptionalRate(raw: string): number | null {
  if (!raw.trim()) return null;
  const normalized = raw.replace(",", ".").replace("%", "");
  const value = Number.parseFloat(normalized);
  return Number.isNaN(value) ? null : value;
}

function parseOptionalInt(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? null : value;
}

function parseOptionalDecimal(raw: string): number | null {
  if (!raw.trim()) return null;
  const normalized = raw.replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isNaN(value) ? null : value;
}

export function validateContractInput(input: CreateContractInput): string | null {
  if (!input.profileId.trim()) return "Bitte eine Person auswählen";
  if (!input.title.trim()) return "Titel ist erforderlich";
  if (!CONTRACT_TYPES.includes(input.contractType)) return "Ungültiger Vertragstyp";
  if (!CONTRACT_STATUSES.includes(input.status)) return "Ungültiger Status";

  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    return "Enddatum darf nicht vor dem Beginn liegen";
  }

  const rates = [
    input.commissionRate,
    input.setupCommissionRate,
    input.retainerCommissionRate,
  ].filter((rate): rate is number => rate != null);

  for (const rate of rates) {
    if (rate < 0 || rate > 100) return "Provision muss zwischen 0 und 100 % liegen";
  }

  if (input.monthlySalaryCents != null && input.monthlySalaryCents < 0) {
    return "Monatsgehalt darf nicht negativ sein";
  }

  if (input.workingHoursPerWeek != null && input.workingHoursPerWeek <= 0) {
    return "Arbeitszeit muss größer als 0 sein";
  }

  if (input.vacationDaysPerYear != null && input.vacationDaysPerYear < 0) {
    return "Urlaubstage dürfen nicht negativ sein";
  }

  if (
    input.retainerCommissionMonths != null &&
    input.retainerCommissionMonths < 0
  ) {
    return "Retainer-Monate dürfen nicht negativ sein";
  }

  return null;
}

export function parseContractFormData(formData: FormData): CreateContractInput {
  const monthlySalaryRaw = String(formData.get("monthlySalary") ?? "").trim();
  const commissionRaw = String(formData.get("commissionRate") ?? "").trim();
  const contractCategoryRaw = String(formData.get("contractCategory") ?? "freelancer");

  let monthlySalaryCents: number | null = null;
  if (monthlySalaryRaw) {
    const normalized = monthlySalaryRaw.replace(/\./g, "").replace(",", ".");
    const euros = Number.parseFloat(normalized);
    if (!Number.isNaN(euros)) monthlySalaryCents = Math.round(euros * 100);
  }

  const status = String(formData.get("status") ?? "draft");
  const contractType = String(formData.get("contractType") ?? "employee");
  const contractCategory =
    contractCategoryRaw === "employee" ? "employee" : "freelancer";

  return {
    profileId: String(formData.get("profileId") ?? "").trim(),
    contractType: contractType as ContractType,
    contractCategory,
    status: isContractStatus(status) ? status : "draft",
    title: String(formData.get("title") ?? "").trim(),
    startDate: String(formData.get("startDate") ?? "").trim() || null,
    endDate: String(formData.get("endDate") ?? "").trim() || null,
    monthlySalaryCents,
    commissionRate: parseOptionalRate(commissionRaw),
    agencyRole: (String(formData.get("agencyRole") ?? "").trim() ||
      null) as AgencyRole | null,
    workingHoursPerWeek: parseOptionalDecimal(
      String(formData.get("workingHoursPerWeek") ?? ""),
    ),
    vacationDaysPerYear: parseOptionalInt(
      String(formData.get("vacationDaysPerYear") ?? ""),
    ),
    setupCommissionRate: parseOptionalRate(
      String(formData.get("setupCommissionRate") ?? ""),
    ),
    retainerCommissionRate: parseOptionalRate(
      String(formData.get("retainerCommissionRate") ?? ""),
    ),
    retainerCommissionMonths: parseOptionalInt(
      String(formData.get("retainerCommissionMonths") ?? ""),
    ),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export function defaultContractTypeForProfile(profile: {
  agency_role: AgencyRole;
  employment_type: EmploymentType;
}): ContractType {
  if (profile.employment_type === "external_partner") return "external_partner";
  if (
    profile.agency_role === "setter" ||
    profile.agency_role === "closer" ||
    profile.agency_role === "project_manager" ||
    profile.agency_role === "customer_success"
  ) {
    return profile.agency_role;
  }
  if (profile.employment_type === "freelancer") return "freelancer";
  return "employee";
}

export function defaultContractCategoryForProfile(profile: {
  agency_role: AgencyRole;
  employment_type: EmploymentType;
}): ContractCategory {
  if (profile.employment_type === "employee") return "employee";
  return resolveContractCategory(defaultContractTypeForProfile(profile));
}

export function defaultContractTitle(profile: {
  full_name: string | null;
  email: string;
  agency_role: AgencyRole;
  employment_type: EmploymentType;
}): string {
  const name = formatProfileName(profile);
  const roleLabel = getAgencyRoleLabel(profile.agency_role);
  const employmentLabel = getEmploymentTypeLabel(profile.employment_type);
  return `Vertrag ${name} (${roleLabel} / ${employmentLabel})`;
}

export function contractInputToDbPayload(
  input: CreateContractInput,
  options?: { preserveStatus?: ContractStatus },
) {
  return {
    profile_id: input.profileId,
    contract_type: input.contractType,
    contract_category: input.contractCategory,
    status: options?.preserveStatus ?? "draft",
    title: input.title,
    start_date: input.startDate,
    end_date: input.endDate,
    monthly_salary_cents: input.monthlySalaryCents,
    commission_rate: input.commissionRate,
    agency_role: input.agencyRole,
    working_hours_per_week: input.workingHoursPerWeek,
    vacation_days_per_year: input.vacationDaysPerYear,
    setup_commission_rate: input.setupCommissionRate,
    retainer_commission_rate: input.retainerCommissionRate,
    retainer_commission_months: input.retainerCommissionMonths,
    notes: input.notes,
  };
}
