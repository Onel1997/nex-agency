import type { AgencyRole, EmploymentType } from "@/lib/auth/types";
import { getAgencyRoleLabel, getEmploymentTypeLabel } from "@/lib/auth/roles";
import {
  CONTRACT_STATUSES,
  CONTRACT_TYPES,
  type ContractStatus,
  type ContractType,
} from "./contract-constants";
import { isContractStatus } from "./contract-numbers";

export interface CreateContractInput {
  profileId: string;
  contractType: ContractType;
  status: ContractStatus;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  monthlySalaryCents?: number | null;
  commissionRate?: number | null;
  notes?: string | null;
}

function formatProfileName(profile: {
  full_name: string | null;
  email: string;
}): string {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

export function validateContractInput(input: CreateContractInput): string | null {
  if (!input.profileId.trim()) return "Bitte eine Person auswählen";
  if (!input.title.trim()) return "Titel ist erforderlich";
  if (!CONTRACT_TYPES.includes(input.contractType)) return "Ungültiger Vertragstyp";
  if (!CONTRACT_STATUSES.includes(input.status)) return "Ungültiger Status";

  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    return "Enddatum darf nicht vor dem Beginn liegen";
  }

  if (
    input.commissionRate != null &&
    (input.commissionRate < 0 || input.commissionRate > 100)
  ) {
    return "Provision muss zwischen 0 und 100 % liegen";
  }

  if (input.monthlySalaryCents != null && input.monthlySalaryCents < 0) {
    return "Monatsgehalt darf nicht negativ sein";
  }

  return null;
}

export function parseContractFormData(formData: FormData): CreateContractInput {
  const monthlySalaryRaw = String(formData.get("monthlySalary") ?? "").trim();
  const commissionRaw = String(formData.get("commissionRate") ?? "").trim();

  let monthlySalaryCents: number | null = null;
  if (monthlySalaryRaw) {
    const normalized = monthlySalaryRaw.replace(/\./g, "").replace(",", ".");
    const euros = Number.parseFloat(normalized);
    if (!Number.isNaN(euros)) monthlySalaryCents = Math.round(euros * 100);
  }

  let commissionRate: number | null = null;
  if (commissionRaw) {
    const normalized = commissionRaw.replace(",", ".").replace("%", "");
    const value = Number.parseFloat(normalized);
    if (!Number.isNaN(value)) commissionRate = value;
  }

  const status = String(formData.get("status") ?? "draft");
  const contractType = String(formData.get("contractType") ?? "employee");

  return {
    profileId: String(formData.get("profileId") ?? "").trim(),
    contractType: contractType as ContractType,
    status: isContractStatus(status) ? status : "draft",
    title: String(formData.get("title") ?? "").trim(),
    startDate: String(formData.get("startDate") ?? "").trim() || null,
    endDate: String(formData.get("endDate") ?? "").trim() || null,
    monthlySalaryCents,
    commissionRate,
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
