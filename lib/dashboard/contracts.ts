import { isManagement } from "@/lib/auth/permissions";
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
  type ContractStatus,
  type ContractType,
} from "./contract-constants";
import { generateContractPdfBuffer } from "./contract-pdf";
import { computeTeamContractStats, filterTeamContractsByStatus } from "./team-contract-status";
import { getMemberCommissionSummary } from "./commission-center";
import { getTeamMembers } from "./team";
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
  parseContractFormData,
  validateContractInput,
} from "./contract-form";

export function isContractsSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("contracts") ||
    normalized.includes("contract_number_counters") ||
    normalized.includes("next_contract_number")
  );
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
    notes: (row.notes as string | null) ?? null,
    pdf_url: (row.pdf_url as string | null) ?? null,
    signed_at: (row.signed_at as string | null) ?? null,
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

const CONTRACT_SELECT = `
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
  profile:profiles!contracts_profile_id_fkey(
    full_name,
    email,
    agency_role,
    employment_type,
    role
  )
`;

async function fetchBillingAddress(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("freelancer_profiles")
    .select("street, postal_code, city, country")
    .eq("profile_id", profileId)
    .maybeSingle();

  return {
    profile_street: (data?.street as string | null) ?? null,
    profile_postal_code: (data?.postal_code as string | null) ?? null,
    profile_city: (data?.city as string | null) ?? null,
    profile_country: (data?.country as string | null) ?? "Deutschland",
  };
}

export async function getContracts(): Promise<TeamContractRecord[]> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select(CONTRACT_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    if (isContractsSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

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
  const { data, error } = await supabase
    .from("contracts")
    .select(CONTRACT_SELECT)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isContractsSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapContractRow(row as Record<string, unknown>));
}

export async function getContractWithDetails(
  contractId: string,
): Promise<ContractWithDetails | null> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select(CONTRACT_SELECT)
    .eq("id", contractId)
    .maybeSingle();

  if (error) {
    if (isContractsSchemaMissingError(error.message)) return null;
    throw new Error(error.message);
  }

  if (!data) return null;

  const base = mapContractRow(data as Record<string, unknown>);
  const address = await fetchBillingAddress(base.profile_id);

  return { ...base, ...address };
}

export async function getContractsDashboardData(
  filters?: {
    status?: string | null;
    agencyRole?: string | null;
    employmentType?: string | null;
    search?: string | null;
  },
): Promise<ContractsDashboardData> {
  const [contracts, members] = await Promise.all([
    getContracts(),
    getTeamMembers(),
  ]);

  const referenceDate = new Date();
  let filtered = filterTeamContractsByStatus(
    contracts,
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
    stats: computeTeamContractStats(contracts, referenceDate),
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

  return { member, contracts, commissionSummary };
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
