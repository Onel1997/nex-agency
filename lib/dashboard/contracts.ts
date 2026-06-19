import { isManagement } from "@/lib/auth/permissions";
import type { AgencyRole } from "@/lib/auth/types";
import {
  agencyRoleFromLegacyRole,
  getAgencyRoleLabel,
  getEmploymentTypeLabel,
  normalizeAgencyRole,
  normalizeEmploymentType,
} from "@/lib/auth/roles";
import { getProfile } from "@/lib/auth/session";
import {
  CONTRACT_PDFS_BUCKET,
  type ContractCategory,
  type ContractOverviewTab,
  type ContractStatus,
  type ContractType,
  resolveContractCategory,
} from "./contract-constants";
import { getContractDocuments } from "./contract-documents";
import { getCustomerContractOverviews } from "./customer-contracts";
import { generateContractPdfBuffer } from "./contract-pdf";
import { computeTeamContractStats, filterTeamContractsByStatus } from "./team-contract-status";
import { getMemberCommissionSummary } from "./commission-center";
import { getTeamMembers } from "./team";
import { fetchContractProfileMasterData, getTeamMemberMasterData } from "./team-master-data";
import type {
  ContractWithDetails,
  ContractsDashboardData,
  TeamContractRecord,
  TeamMemberDetailData,
} from "./types";
import { createClient } from "@/lib/supabase/server";

export { CONTRACT_PDFS_BUCKET };
export type { CreateContractInput } from "./contract-form";
export {
  defaultContractTitle,
  defaultContractTypeForProfile,
  defaultContractCategoryForProfile,
  parseContractFormData,
  validateContractInput,
  contractInputToDbPayload,
} from "./contract-form";

export function isContractsTableMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    (normalized.includes("relation") &&
      normalized.includes("contracts") &&
      normalized.includes("does not exist")) ||
    normalized.includes("contract_number_counters") ||
    normalized.includes("next_contract_number")
  );
}

/** @deprecated Use isContractsTableMissingError — kept for callers during transition */
export function isContractsSchemaMissingError(message: string): boolean {
  return isContractsTableMissingError(message);
}

export function isContractLifecycleColumnsMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  if (!normalized.includes("does not exist") && !normalized.includes("could not find")) {
    return false;
  }

  return [
    "sent_at",
    "activated_at",
    "terminated_at",
    "archived_at",
    "signed_by_agency",
    "signed_by_partner",
    "agency_signed_at",
    "partner_signed_at",
  ].some((column) => normalized.includes(column));
}

export function isContractV2ColumnsMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  if (!normalized.includes("does not exist") && !normalized.includes("could not find")) {
    return false;
  }

  return [
    "contract_category",
    "agency_role",
    "working_hours_per_week",
    "vacation_days_per_year",
    "setup_commission_rate",
    "retainer_commission_rate",
    "retainer_commission_months",
    "freelancer_profile_id",
  ].some((column) => normalized.includes(column));
}

function formatProfileName(profile: {
  full_name: string | null;
  email: string;
}): string {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

function mapContractRow(row: Record<string, unknown>): TeamContractRecord {
  const profile = Array.isArray(row.profile)
    ? row.profile[0]
    : row.profile;
  const profileData = profile as {
    full_name: string | null;
    email: string;
    agency_role: string;
    employment_type: string;
    role: string;
  } | null;

  const agencyRole =
    normalizeAgencyRole(profileData?.agency_role) ??
    agencyRoleFromLegacyRole(profileData?.role ?? null);
  const employmentType =
    normalizeEmploymentType(profileData?.employment_type) ??
    "employee";

  return {
    id: row.id as string,
    profile_id: row.profile_id as string,
    contract_type: row.contract_type as ContractType,
    contract_category:
      (row.contract_category as ContractCategory | null) ??
      resolveContractCategory(row.contract_type as ContractType),
    status: row.status as ContractStatus,
    title: row.title as string,
    contract_number: row.contract_number as string,
    start_date: (row.start_date as string | null) ?? null,
    end_date: (row.end_date as string | null) ?? null,
    monthly_salary_cents:
      row.monthly_salary_cents != null
        ? Number(row.monthly_salary_cents)
        : null,
    commission_rate:
      row.commission_rate != null ? Number(row.commission_rate) : null,
    agency_role:
      normalizeAgencyRole(row.agency_role as string | null) ??
      agencyRole,
    working_hours_per_week:
      row.working_hours_per_week != null
        ? Number(row.working_hours_per_week)
        : null,
    vacation_days_per_year:
      row.vacation_days_per_year != null
        ? Number(row.vacation_days_per_year)
        : null,
    setup_commission_rate:
      row.setup_commission_rate != null
        ? Number(row.setup_commission_rate)
        : null,
    retainer_commission_rate:
      row.retainer_commission_rate != null
        ? Number(row.retainer_commission_rate)
        : null,
    retainer_commission_months:
      row.retainer_commission_months != null
        ? Number(row.retainer_commission_months)
        : null,
    freelancer_profile_id: (row.freelancer_profile_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    pdf_url: (row.pdf_url as string | null) ?? null,
    signed_at: (row.signed_at as string | null) ?? null,
    sent_at: (row.sent_at as string | null) ?? null,
    activated_at: (row.activated_at as string | null) ?? null,
    terminated_at: (row.terminated_at as string | null) ?? null,
    archived_at: (row.archived_at as string | null) ?? null,
    signed_by_agency: Boolean(row.signed_by_agency),
    signed_by_partner: Boolean(row.signed_by_partner),
    agency_signed_at: (row.agency_signed_at as string | null) ?? null,
    partner_signed_at: (row.partner_signed_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    profile_name: formatProfileName(
      profileData ?? { full_name: null, email: "—" },
    ),
    profile_email: profileData?.email ?? "—",
    profile_agency_role: agencyRole,
    profile_employment_type: employmentType,
    profile_agency_role_label: getAgencyRoleLabel(agencyRole),
    profile_employment_type_label: getEmploymentTypeLabel(employmentType),
  };
}

const CONTRACT_PROFILE_SELECT = `
  profile:profiles!contracts_profile_id_fkey(
    full_name,
    email,
    agency_role,
    employment_type,
    role
  )
`;

const CONTRACT_SELECT_LEGACY = `
  id,
  profile_id,
  contract_type,
  status,
  title,
  contract_number,
  start_date,
  end_date,
  monthly_salary_cents,
  commission_rate,
  notes,
  pdf_url,
  signed_at,
  created_at,
  updated_at,
  ${CONTRACT_PROFILE_SELECT}
`;

const CONTRACT_SELECT_V2 = `
  id,
  profile_id,
  contract_type,
  contract_category,
  status,
  title,
  contract_number,
  start_date,
  end_date,
  monthly_salary_cents,
  commission_rate,
  agency_role,
  working_hours_per_week,
  vacation_days_per_year,
  setup_commission_rate,
  retainer_commission_rate,
  retainer_commission_months,
  freelancer_profile_id,
  notes,
  pdf_url,
  signed_at,
  created_at,
  updated_at,
  ${CONTRACT_PROFILE_SELECT}
`;

const CONTRACT_SELECT = `
  id,
  profile_id,
  contract_type,
  contract_category,
  status,
  title,
  contract_number,
  start_date,
  end_date,
  monthly_salary_cents,
  commission_rate,
  agency_role,
  working_hours_per_week,
  vacation_days_per_year,
  setup_commission_rate,
  retainer_commission_rate,
  retainer_commission_months,
  freelancer_profile_id,
  notes,
  pdf_url,
  signed_at,
  sent_at,
  activated_at,
  terminated_at,
  archived_at,
  signed_by_agency,
  signed_by_partner,
  agency_signed_at,
  partner_signed_at,
  created_at,
  updated_at,
  ${CONTRACT_PROFILE_SELECT}
`;

async function queryContracts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: { profileId?: string; contractId?: string; single: true },
): Promise<
  | { data: Record<string, unknown> | null; error: null }
  | { data: null; error: { message: string } }
>;
async function queryContracts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options?: { profileId?: string; contractId?: string; single?: false },
): Promise<
  | { data: Record<string, unknown>[]; error: null }
  | { data: null; error: { message: string } }
>;
async function queryContracts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: {
    profileId?: string;
    contractId?: string;
    single?: boolean;
  } = {},
): Promise<
  | { data: Record<string, unknown> | Record<string, unknown>[] | null; error: null }
  | { data: null; error: { message: string } }
> {
  const selects = [CONTRACT_SELECT, CONTRACT_SELECT_V2, CONTRACT_SELECT_LEGACY];

  for (let index = 0; index < selects.length; index += 1) {
    const select = selects[index];
    let query = supabase.from("contracts").select(select);

    if (options.profileId) {
      query = query.eq("profile_id", options.profileId);
    }
    if (options.contractId) {
      query = query.eq("id", options.contractId);
    }
    if (!options.single) {
      query = query.order("created_at", { ascending: false });
    }

    const result = options.single ? await query.maybeSingle() : await query;

    if (!result.error) {
      if (options.single) {
        return {
          data: (result.data as Record<string, unknown> | null) ?? null,
          error: null,
        };
      }
      return {
        data: (result.data as Record<string, unknown>[] | null) ?? [],
        error: null,
      };
    }

    const message = result.error.message;
    if (isContractsTableMissingError(message)) {
      return options.single
        ? { data: null, error: null }
        : { data: [], error: null };
    }

    const hasFallback = index < selects.length - 1;
    const lifecycleMissing = isContractLifecycleColumnsMissingError(message);
    const v2Missing = isContractV2ColumnsMissingError(message);

    if (hasFallback && (lifecycleMissing || v2Missing)) {
      continue;
    }

    return { data: null, error: { message } };
  }

  return options.single ? { data: null, error: null } : { data: [], error: null };
}

async function fetchBillingProfile(
  profileId: string,
  contractCategory: ContractCategory,
) {
  return fetchContractProfileMasterData(profileId, contractCategory);
}

export async function getContracts(): Promise<TeamContractRecord[]> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await queryContracts(supabase);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => mapContractRow(row as Record<string, unknown>));
}

export async function getContractsByProfileId(
  profileId: string,
): Promise<TeamContractRecord[]> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await queryContracts(supabase, { profileId });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => mapContractRow(row as Record<string, unknown>));
}

export async function getContractWithDetails(
  contractId: string,
): Promise<ContractWithDetails | null> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) return null;

  const supabase = await createClient();
  const { data, error } = await queryContracts(supabase, {
    contractId,
    single: true,
  });

  if (error) throw new Error(error.message);
  if (!data) return null;

  const base = mapContractRow(data);
  const [billing, documents] = await Promise.all([
    fetchBillingProfile(base.profile_id, base.contract_category),
    getContractDocuments(contractId),
  ]);

  return { ...base, ...billing, documents };
}

export async function getContractsDashboardData(
  filters?: {
    tab?: ContractOverviewTab | null;
    status?: string | null;
    agencyRole?: string | null;
    employmentType?: string | null;
    search?: string | null;
  },
): Promise<ContractsDashboardData> {
  const tab = filters?.tab ?? "freelancer";
  const [allContracts, members, customerContracts] = await Promise.all([
    getContracts(),
    getTeamMembers(),
    tab === "kunden" ? getCustomerContractOverviews() : Promise.resolve([]),
  ]);

  const referenceDate = new Date();
  let filtered = allContracts;

  if (tab === "freelancer") {
    filtered = filtered.filter((contract) => contract.contract_category === "freelancer");
  } else if (tab === "mitarbeiter") {
    filtered = filtered.filter((contract) => contract.contract_category === "employee");
  } else {
    filtered = [];
  }

  filtered = filterTeamContractsByStatus(
    filtered,
    filters?.status ?? null,
    referenceDate,
  );

  if (filters?.agencyRole && filters.agencyRole !== "all") {
    filtered = filtered.filter(
      (contract) => contract.profile_agency_role === filters.agencyRole,
    );
  }

  if (filters?.employmentType && filters.employmentType !== "all") {
    filtered = filtered.filter(
      (contract) => contract.profile_employment_type === filters.employmentType,
    );
  }

  const search = filters?.search?.trim().toLowerCase();
  if (search) {
    filtered = filtered.filter(
      (contract) =>
        contract.profile_name.toLowerCase().includes(search) ||
        contract.profile_email.toLowerCase().includes(search) ||
        contract.contract_number.toLowerCase().includes(search) ||
        contract.title.toLowerCase().includes(search),
    );
  }

  return {
    contracts: filtered,
    customerContracts,
    activeTab: tab,
    stats: computeTeamContractStats(allContracts, referenceDate),
    members,
  };
}

export async function getTeamMemberDetailData(
  memberId: string,
): Promise<TeamMemberDetailData | null> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) return null;

  const members = await getTeamMembers();
  const member = members.find((entry) => entry.id === memberId);
  if (!member) return null;

  const contracts = await getContractsByProfileId(memberId);
  const commissionSummary = await getMemberCommissionSummary(memberId);
  const masterData =
    (await getTeamMemberMasterData(memberId)) ?? {
      profile_id: memberId,
      employment_type: member.employment_type,
      is_freelancer: member.employment_type === "freelancer",
      phone: null,
      street: null,
      house_number: null,
      postal_code: null,
      city: null,
      country: "Deutschland",
      iban: null,
      bic: null,
      bank_name: null,
      tax_id: null,
      social_security_number: null,
      health_insurance: null,
      employee_number: null,
      birth_date: null,
      business_name: null,
      tax_number: null,
      vat_id: null,
    };

  return { member, masterData, contracts, commissionSummary };
}

async function uploadContractPdf(
  contractId: string,
  contractNumber: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const supabase = await createClient();
  const storagePath = `${contractId}/${contractNumber}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(CONTRACT_PDFS_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return `/api/contracts/${contractId}/pdf`;
  }

  return storagePath;
}

export async function generateAndStoreContractPdf(
  contractId: string,
): Promise<string> {
  const contract = await getContractWithDetails(contractId);
  if (!contract) throw new Error("Vertrag nicht gefunden");

  const pdfBuffer = await generateContractPdfBuffer(contract);
  const pdfUrl = await uploadContractPdf(
    contractId,
    contract.contract_number,
    pdfBuffer,
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("contracts")
    .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
    .eq("id", contractId);

  if (error) throw new Error(error.message);
  return pdfUrl;
}
