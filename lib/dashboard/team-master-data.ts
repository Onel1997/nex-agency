import { isManagement } from "@/lib/auth/permissions";
import { normalizeEmploymentType } from "@/lib/auth/roles";
import { getProfile } from "@/lib/auth/session";
import {
  getOrCreateFreelancerProfile,
  updateFreelancerProfileRecord,
  type FreelancerProfileInput,
} from "./freelancer-profiles";
import type { FreelancerProfileRecord, TeamMemberMasterData } from "./types";
import { createClient } from "@/lib/supabase/server";

export const MASTER_DATA_NOT_CONFIGURED = "Nicht hinterlegt";

export function formatMasterDataValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : MASTER_DATA_NOT_CONFIGURED;
}

export function formatMasterDataAddress(input: {
  street?: string | null;
  house_number?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}): string {
  const streetLine = [input.street?.trim(), input.house_number?.trim()]
    .filter(Boolean)
    .join(" ");
  const cityLine = [input.postal_code?.trim(), input.city?.trim()]
    .filter(Boolean)
    .join(" ");
  const parts = [streetLine, cityLine, input.country?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : MASTER_DATA_NOT_CONFIGURED;
}

export function isTeamMasterDataSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") &&
    (normalized.includes("house_number") ||
      normalized.includes("social_security_number") ||
      normalized.includes("health_insurance") ||
      normalized.includes("employee_number") ||
      normalized.includes("birth_date") ||
      normalized.includes("tax_id"))
  );
}

const EMPLOYEE_MASTER_SELECT =
  "phone, street, house_number, postal_code, city, country, iban, bic, bank_name, tax_id, social_security_number, health_insurance, employee_number, birth_date, employment_type";

function emptyEmployeeMasterData(): Omit<
  TeamMemberMasterData,
  "profile_id" | "employment_type" | "is_freelancer"
> {
  return {
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
}

function mapEmployeeRow(
  profileId: string,
  employmentType: TeamMemberMasterData["employment_type"],
  row: Record<string, unknown> | null,
): TeamMemberMasterData {
  return {
    profile_id: profileId,
    employment_type: employmentType,
    is_freelancer: employmentType === "freelancer",
    phone: (row?.phone as string | null) ?? null,
    street: (row?.street as string | null) ?? null,
    house_number: (row?.house_number as string | null) ?? null,
    postal_code: (row?.postal_code as string | null) ?? null,
    city: (row?.city as string | null) ?? null,
    country: (row?.country as string | null) ?? "Deutschland",
    iban: (row?.iban as string | null) ?? null,
    bic: (row?.bic as string | null) ?? null,
    bank_name: (row?.bank_name as string | null) ?? null,
    tax_id: (row?.tax_id as string | null) ?? null,
    social_security_number: (row?.social_security_number as string | null) ?? null,
    health_insurance: (row?.health_insurance as string | null) ?? null,
    employee_number: (row?.employee_number as string | null) ?? null,
    birth_date: (row?.birth_date as string | null) ?? null,
    business_name: null,
    tax_number: null,
    vat_id: null,
  };
}

function mapFreelancerRow(row: Record<string, unknown>): FreelancerProfileRecord {
  return {
    id: row.id as string,
    profile_id: row.profile_id as string,
    iban: (row.iban as string | null) ?? null,
    bic: (row.bic as string | null) ?? null,
    bank_name: (row.bank_name as string | null) ?? null,
    street: (row.street as string | null) ?? null,
    house_number: (row.house_number as string | null) ?? null,
    postal_code: (row.postal_code as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    country: (row.country as string | null) ?? "Deutschland",
    phone: (row.phone as string | null) ?? null,
    tax_number: (row.tax_number as string | null) ?? null,
    vat_id: (row.vat_id as string | null) ?? null,
    business_name: (row.business_name as string | null) ?? null,
    invoice_prefix: String(row.invoice_prefix ?? "FR").trim() || "FR",
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

async function fetchFreelancerProfileRow(
  profileId: string,
): Promise<FreelancerProfileRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("freelancer_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    if (isTeamMasterDataSchemaMissingError(error.message)) return null;
    throw new Error(error.message);
  }

  return data ? mapFreelancerRow(data as Record<string, unknown>) : null;
}

function mapFreelancerMasterData(
  profileId: string,
  employmentType: TeamMemberMasterData["employment_type"],
  billing: FreelancerProfileRecord,
): TeamMemberMasterData {
  return {
    profile_id: profileId,
    employment_type: employmentType,
    is_freelancer: true,
    phone: billing.phone,
    street: billing.street,
    house_number: billing.house_number,
    postal_code: billing.postal_code,
    city: billing.city,
    country: billing.country,
    iban: billing.iban,
    bic: billing.bic,
    bank_name: billing.bank_name,
    tax_id: null,
    social_security_number: null,
    health_insurance: null,
    employee_number: null,
    birth_date: null,
    business_name: billing.business_name,
    tax_number: billing.tax_number,
    vat_id: billing.vat_id,
  };
}

export async function getTeamMemberMasterData(
  profileId: string,
): Promise<TeamMemberMasterData | null> {
  const actor = await getProfile();
  if (!actor || !isManagement(actor)) return null;

  const supabase = await createClient();
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select(`id, employment_type, ${EMPLOYEE_MASTER_SELECT}`)
    .eq("id", profileId)
    .maybeSingle();

  if (profileError) {
    if (isTeamMasterDataSchemaMissingError(profileError.message)) {
      return {
        profile_id: profileId,
        employment_type: "employee",
        is_freelancer: false,
        ...emptyEmployeeMasterData(),
      };
    }
    throw new Error(profileError.message);
  }

  if (!profileRow) return null;

  const employmentType =
    normalizeEmploymentType(profileRow.employment_type as string | null) ??
    "employee";

  if (employmentType === "freelancer") {
    const billing = await fetchFreelancerProfileRow(profileId);
    if (!billing) {
      return {
        profile_id: profileId,
        employment_type: employmentType,
        is_freelancer: true,
        ...emptyEmployeeMasterData(),
      };
    }
    return mapFreelancerMasterData(profileId, employmentType, billing);
  }

  return mapEmployeeRow(profileId, employmentType, profileRow as Record<string, unknown>);
}

export interface EmployeeMasterDataInput {
  phone?: string | null;
  street?: string | null;
  house_number?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  iban?: string | null;
  bic?: string | null;
  bank_name?: string | null;
  tax_id?: string | null;
  social_security_number?: string | null;
  health_insurance?: string | null;
  employee_number?: string | null;
  birth_date?: string | null;
}

export interface FreelancerMasterDataInput extends FreelancerProfileInput {
  phone?: string | null;
  house_number?: string | null;
}

export async function updateEmployeeMasterData(
  profileId: string,
  input: EmployeeMasterDataInput,
): Promise<TeamMemberMasterData> {
  const actor = await getProfile();
  if (!actor || !isManagement(actor)) {
    throw new Error("Keine Berechtigung");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      phone: input.phone?.trim() || null,
      street: input.street?.trim() || null,
      house_number: input.house_number?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || "Deutschland",
      iban: input.iban?.trim() || null,
      bic: input.bic?.trim() || null,
      bank_name: input.bank_name?.trim() || null,
      tax_id: input.tax_id?.trim() || null,
      social_security_number: input.social_security_number?.trim() || null,
      health_insurance: input.health_insurance?.trim() || null,
      employee_number: input.employee_number?.trim() || null,
      birth_date: input.birth_date?.trim() || null,
    })
    .eq("id", profileId)
    .select(`id, employment_type, ${EMPLOYEE_MASTER_SELECT}`)
    .single();

  if (error) throw new Error(error.message);

  const employmentType =
    normalizeEmploymentType(data.employment_type as string | null) ?? "employee";

  return mapEmployeeRow(profileId, employmentType, data as Record<string, unknown>);
}

export async function updateFreelancerMasterData(
  profileId: string,
  input: FreelancerMasterDataInput,
): Promise<TeamMemberMasterData> {
  const actor = await getProfile();
  if (!actor || !isManagement(actor)) {
    throw new Error("Keine Berechtigung");
  }

  await updateFreelancerProfileRecord(profileId, input);
  const billing = await getOrCreateFreelancerProfile(profileId);
  const employmentType = "freelancer" as const;

  return {
    ...mapFreelancerMasterData(profileId, employmentType, {
      ...billing,
      phone: input.phone?.trim() || billing.phone,
      house_number: input.house_number?.trim() || billing.house_number,
    }),
  };
}

async function fetchProfileMasterFields(
  profileId: string,
): Promise<Record<string, unknown> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(EMPLOYEE_MASTER_SELECT)
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    if (isTeamMasterDataSchemaMissingError(error.message)) return null;
    throw new Error(error.message);
  }

  return (data as Record<string, unknown> | null) ?? null;
}

export async function fetchContractProfileMasterData(
  profileId: string,
  contractCategory: import("./contract-constants").ContractCategory,
): Promise<{
  freelancer_profile_id: string | null;
  profile_street: string | null;
  profile_house_number: string | null;
  profile_postal_code: string | null;
  profile_city: string | null;
  profile_country: string | null;
  profile_phone: string | null;
  profile_iban: string | null;
  profile_bic: string | null;
  profile_bank_name: string | null;
  profile_tax_number: string | null;
  profile_vat_id: string | null;
  profile_business_name: string | null;
  profile_tax_id: string | null;
  profile_social_security_number: string | null;
  profile_health_insurance: string | null;
  profile_employee_number: string | null;
  profile_birth_date: string | null;
}> {
  const empty = {
    freelancer_profile_id: null as string | null,
    profile_street: null as string | null,
    profile_house_number: null as string | null,
    profile_postal_code: null as string | null,
    profile_city: null as string | null,
    profile_country: "Deutschland" as string | null,
    profile_phone: null as string | null,
    profile_iban: null as string | null,
    profile_bic: null as string | null,
    profile_bank_name: null as string | null,
    profile_tax_number: null as string | null,
    profile_vat_id: null as string | null,
    profile_business_name: null as string | null,
    profile_tax_id: null as string | null,
    profile_social_security_number: null as string | null,
    profile_health_insurance: null as string | null,
    profile_employee_number: null as string | null,
    profile_birth_date: null as string | null,
  };

  const profileRow = await fetchProfileMasterFields(profileId);

  if (contractCategory === "freelancer") {
    const billing = await fetchFreelancerProfileRow(profileId);
    return {
      ...empty,
      freelancer_profile_id: billing?.id ?? null,
      profile_street: billing?.street ?? (profileRow?.street as string | null) ?? null,
      profile_house_number:
        billing?.house_number ?? (profileRow?.house_number as string | null) ?? null,
      profile_postal_code:
        billing?.postal_code ?? (profileRow?.postal_code as string | null) ?? null,
      profile_city: billing?.city ?? (profileRow?.city as string | null) ?? null,
      profile_country:
        billing?.country ?? (profileRow?.country as string | null) ?? "Deutschland",
      profile_phone: billing?.phone ?? (profileRow?.phone as string | null) ?? null,
      profile_iban: billing?.iban ?? (profileRow?.iban as string | null) ?? null,
      profile_bic: billing?.bic ?? (profileRow?.bic as string | null) ?? null,
      profile_bank_name:
        billing?.bank_name ?? (profileRow?.bank_name as string | null) ?? null,
      profile_tax_number: billing?.tax_number ?? null,
      profile_vat_id: billing?.vat_id ?? null,
      profile_business_name: billing?.business_name ?? null,
    };
  }

  if (!profileRow) return empty;

  return {
    ...empty,
    profile_street: (profileRow.street as string | null) ?? null,
    profile_house_number: (profileRow.house_number as string | null) ?? null,
    profile_postal_code: (profileRow.postal_code as string | null) ?? null,
    profile_city: (profileRow.city as string | null) ?? null,
    profile_country: (profileRow.country as string | null) ?? "Deutschland",
    profile_phone: (profileRow.phone as string | null) ?? null,
    profile_iban: (profileRow.iban as string | null) ?? null,
    profile_bic: (profileRow.bic as string | null) ?? null,
    profile_bank_name: (profileRow.bank_name as string | null) ?? null,
    profile_tax_id: (profileRow.tax_id as string | null) ?? null,
    profile_social_security_number:
      (profileRow.social_security_number as string | null) ?? null,
    profile_health_insurance: (profileRow.health_insurance as string | null) ?? null,
    profile_employee_number: (profileRow.employee_number as string | null) ?? null,
    profile_birth_date: (profileRow.birth_date as string | null) ?? null,
  };
}
