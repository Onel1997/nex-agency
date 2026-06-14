import { createClient } from "@/lib/supabase/server";
import type { BillingCycle, CommissionStatus } from "./constants";
import {
  isContractStatusSchemaMissingError,
  resolveContractStatus,
} from "./contract-status";
import {
  calculateAgencyShareCents,
  calculateFreelancerPayoutCents,
  isClientFreelancerSchemaMissingError,
  resolveFreelancerPayoutFields,
} from "./client-freelancer-payout";
import {
  isClientSoftDeleteSchemaMissingError,
} from "./client-soft-delete";
import type { ClientDetailRecord, ClientRecord } from "./types";

function formatMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

export function isClientArchiveSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("is_archived") ||
    (normalized.includes("column") && normalized.includes("archived"))
  );
}

export function isClientVisibilitySchemaMissingError(message: string): boolean {
  return (
    isClientArchiveSchemaMissingError(message) ||
    isClientSoftDeleteSchemaMissingError(message)
  );
}

export const CLIENT_ARCHIVE_MIGRATION_HINT =
  "Migration 20250622120000_client_archive.sql fehlt. Bitte `supabase db push` ausführen.";

/** Scalar client columns only — no embeds. */
const CLIENT_SCALAR_FIELDS = `
  id,
  lead_id,
  company_name,
  customer_number,
  contact_name,
  email,
  phone,
  website,
  responsible_member_id,
  setter_id,
  closer_id,
  lead_estimated_value_cents,
  monthly_retainer_cents,
  one_time_project_value_cents,
  currency,
  created_at
`;

/** Embeds must be last in PostgREST select strings. */
const CLIENT_LIST_EMBEDS = `
  responsible_member:profiles!clients_responsible_member_id_fkey(full_name, email)
`;

const CLIENT_DETAIL_SCALAR_FIELDS = `
  monthly_revenue_cents,
  setup_fee_cents,
  contract_start_date,
  billing_cycle,
  next_invoice_date,
  last_invoice_date,
  auto_invoice_enabled,
  total_revenue_cents,
  commission_status,
  commission_total_cents,
  commission_paid_cents,
  commission_outstanding_cents,
  assigned_freelancer_id,
  freelancer_commission_rate,
  freelancer_payout_cents,
  freelancer_paid_cents,
  freelancer_outstanding_cents,
  freelancer_payout_status,
  contract_status
`;

const CLIENT_DETAIL_EMBEDS = `
  assigned_freelancer:profiles!clients_assigned_freelancer_id_fkey(full_name, email)
`;

const CLIENT_SELECT_WITH_ARCHIVE = `
  ${CLIENT_SCALAR_FIELDS},
  is_archived,
  deleted_at,
  ${CLIENT_LIST_EMBEDS}
`;

const CLIENT_SELECT = `
  ${CLIENT_SCALAR_FIELDS},
  ${CLIENT_LIST_EMBEDS}
`;

const CLIENT_DETAIL_SELECT_WITH_ARCHIVE = `
  ${CLIENT_SCALAR_FIELDS},
  is_archived,
  deleted_at,
  ${CLIENT_DETAIL_SCALAR_FIELDS},
  ${CLIENT_LIST_EMBEDS},
  ${CLIENT_DETAIL_EMBEDS}
`;

const CLIENT_DETAIL_SELECT_WITHOUT_CONTRACT_STATUS_WITH_ARCHIVE = `
  ${CLIENT_SCALAR_FIELDS},
  is_archived,
  deleted_at,
  ${CLIENT_DETAIL_SCALAR_FIELDS.replace(",\n  contract_status", "")},
  ${CLIENT_LIST_EMBEDS},
  ${CLIENT_DETAIL_EMBEDS}
`;

const CLIENT_DETAIL_SELECT = `
  ${CLIENT_SCALAR_FIELDS},
  ${CLIENT_DETAIL_SCALAR_FIELDS},
  ${CLIENT_LIST_EMBEDS},
  ${CLIENT_DETAIL_EMBEDS}
`;

const CLIENT_DETAIL_SELECT_WITHOUT_CONTRACT_STATUS = `
  ${CLIENT_SCALAR_FIELDS},
  ${CLIENT_DETAIL_SCALAR_FIELDS.replace(",\n  contract_status", "")},
  ${CLIENT_LIST_EMBEDS},
  ${CLIENT_DETAIL_EMBEDS}
`;

const CLIENT_DETAIL_MINIMAL_SELECT_WITH_ARCHIVE = `
  ${CLIENT_SCALAR_FIELDS},
  is_archived,
  deleted_at,
  monthly_revenue_cents,
  setup_fee_cents,
  total_revenue_cents,
  commission_status,
  ${CLIENT_LIST_EMBEDS}
`;

const CLIENT_DETAIL_MINIMAL_SELECT = `
  ${CLIENT_SCALAR_FIELDS},
  monthly_revenue_cents,
  setup_fee_cents,
  total_revenue_cents,
  commission_status,
  ${CLIENT_LIST_EMBEDS}
`;

function isClientDetailSchemaMissingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    isClientArchiveSchemaMissingError(message) ||
    isContractStatusSchemaMissingError(message) ||
    normalized.includes("commission_total_cents") ||
    normalized.includes("contract_start_date") ||
    normalized.includes("billing_cycle") ||
    isClientFreelancerSchemaMissingError(message)
  );
}

function mapClientRow(
  row: Record<string, unknown>,
  archiveSupported: boolean,
): ClientRecord {
  const responsibleMember = Array.isArray(row.responsible_member)
    ? row.responsible_member[0]
    : row.responsible_member;

  return {
    id: row.id as string,
    lead_id: row.lead_id as string,
    company_name: row.company_name as string,
    customer_number: (row.customer_number as string | null) ?? null,
    contact_name: (row.contact_name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    responsible_member_id: (row.responsible_member_id as string | null) ?? null,
    setter_id: (row.setter_id as string | null) ?? null,
    closer_id: (row.closer_id as string | null) ?? null,
    lead_estimated_value_cents:
      (row.lead_estimated_value_cents as number | null) ?? null,
    monthly_retainer_cents: (row.monthly_retainer_cents as number | null) ?? null,
    one_time_project_value_cents:
      (row.one_time_project_value_cents as number | null) ?? null,
    currency: (row.currency as string) ?? "EUR",
    created_at: row.created_at as string,
    responsible_member_name: formatMemberName(
      responsibleMember as { full_name: string | null; email: string } | null,
    ),
    is_archived: archiveSupported ? Boolean(row.is_archived) : false,
  };
}

async function queryClients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: {
    selectWithArchive: string;
    selectWithoutArchive: string;
    id?: string;
    activeOnly?: boolean;
    limit?: number;
  },
): Promise<{
  rows: Record<string, unknown>[];
  archiveSupported: boolean;
  softDeleteSupported: boolean;
}> {
  const runQuery = (
    select: string,
    filterActive: boolean,
    filterDeleted: boolean,
  ) => {
    let query = supabase.from("clients").select(select);

    if (options.id) {
      query = query.eq("id", options.id);
    }

    if (filterActive) {
      query = query.eq("is_archived", false);
    }

    if (filterDeleted) {
      query = query.is("deleted_at", null);
    }

    query = query.order("created_at", { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    return options.id ? query.maybeSingle() : query;
  };

  let archiveSupported = true;
  let softDeleteSupported = true;
  let result = await runQuery(
    options.selectWithArchive,
    Boolean(options.activeOnly),
    Boolean(options.activeOnly),
  );

  if (result.error && isClientSoftDeleteSchemaMissingError(result.error.message)) {
    softDeleteSupported = false;
    result = await runQuery(
      options.selectWithArchive,
      Boolean(options.activeOnly),
      false,
    );
  }

  if (result.error && isClientArchiveSchemaMissingError(result.error.message)) {
    archiveSupported = false;
    softDeleteSupported = false;
    result = await runQuery(
      options.selectWithoutArchive,
      false,
      false,
    );
  }

  if (result.error) throw new Error(result.error.message);

  if (options.id) {
    const row = result.data as Record<string, unknown> | null;
    if (
      row &&
      options.activeOnly &&
      softDeleteSupported &&
      row.deleted_at != null
    ) {
      return { rows: [], archiveSupported, softDeleteSupported };
    }
    return { rows: row ? [row] : [], archiveSupported, softDeleteSupported };
  }

  return {
    rows: (result.data ?? []) as unknown as Record<string, unknown>[],
    archiveSupported,
    softDeleteSupported,
  };
}

export async function getClients(): Promise<ClientRecord[]> {
  const supabase = await createClient();
  const { rows, archiveSupported } = await queryClients(supabase, {
    selectWithArchive: CLIENT_SELECT_WITH_ARCHIVE,
    selectWithoutArchive: CLIENT_SELECT,
    activeOnly: true,
  });

  return rows.map((row) => mapClientRow(row, archiveSupported));
}

export async function getRecentClients(limit = 5): Promise<ClientRecord[]> {
  const supabase = await createClient();
  const { rows, archiveSupported } = await queryClients(supabase, {
    selectWithArchive: CLIENT_SELECT_WITH_ARCHIVE,
    selectWithoutArchive: CLIENT_SELECT,
    activeOnly: true,
    limit,
  });

  return rows.map((row) => mapClientRow(row, archiveSupported));
}

export async function getClientById(id: string): Promise<ClientRecord | null> {
  const supabase = await createClient();
  const { rows, archiveSupported } = await queryClients(supabase, {
    selectWithArchive: CLIENT_SELECT_WITH_ARCHIVE,
    selectWithoutArchive: CLIENT_SELECT,
    id,
    activeOnly: true,
  });

  const row = rows[0];
  if (!row) return null;
  return mapClientRow(row, archiveSupported);
}

function mapClientDetailRow(
  row: Record<string, unknown>,
  archiveSupported: boolean,
): ClientDetailRecord {
  const base = mapClientRow(row, archiveSupported);
  const freelancerFields = resolveFreelancerPayoutFields({
    freelancerPayoutCents: (row.freelancer_payout_cents as number) ?? 0,
    freelancerPaidCents: (row.freelancer_paid_cents as number) ?? 0,
  });

  return {
    ...base,
    monthly_revenue_cents: (row.monthly_revenue_cents as number | null) ?? null,
    setup_fee_cents: (row.setup_fee_cents as number | null) ?? null,
    contract_start_date: (row.contract_start_date as string | null) ?? null,
    contract_status: resolveContractStatus(row),
    billing_cycle: ((row.billing_cycle as BillingCycle | null) ?? "monthly") as BillingCycle,
    next_invoice_date: (row.next_invoice_date as string | null) ?? null,
    last_invoice_date: (row.last_invoice_date as string | null) ?? null,
    auto_invoice_enabled: Boolean(row.auto_invoice_enabled),
    total_revenue_cents: (row.total_revenue_cents as number | null) ?? null,
    commission_status: (row.commission_status as CommissionStatus) ?? "none",
    commission_total_cents: (row.commission_total_cents as number) ?? 0,
    commission_paid_cents: (row.commission_paid_cents as number) ?? 0,
    commission_outstanding_cents:
      (row.commission_outstanding_cents as number) ?? 0,
    assigned_freelancer_id: (row.assigned_freelancer_id as string | null) ?? null,
    assigned_freelancer_name: formatMemberName(
      (Array.isArray(row.assigned_freelancer)
        ? row.assigned_freelancer[0]
        : row.assigned_freelancer) as {
        full_name: string | null;
        email: string;
      } | null,
    ),
    freelancer_commission_rate: Number(row.freelancer_commission_rate ?? 0),
    freelancer_payout_cents: freelancerFields.freelancer_payout_cents,
    freelancer_paid_cents: freelancerFields.freelancer_paid_cents,
    freelancer_outstanding_cents: freelancerFields.freelancer_outstanding_cents,
    freelancer_payout_status: freelancerFields.freelancer_payout_status,
    agency_share_cents: calculateAgencyShareCents(
      (row.setup_fee_cents as number | null) ?? null,
      calculateFreelancerPayoutCents(
        (row.setup_fee_cents as number | null) ?? null,
        Number(row.freelancer_commission_rate ?? 0),
      ),
    ),
  };
}

async function queryClientDetailById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  selectWithArchive: string,
  selectWithoutArchive: string,
): Promise<{
  row: Record<string, unknown> | null;
  archiveSupported: boolean;
  error: string | null;
}> {
  let archiveSupported = true;
  let softDeleteSupported = true;
  let { data, error } = await supabase
    .from("clients")
    .select(selectWithArchive)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error && isClientSoftDeleteSchemaMissingError(error.message)) {
    softDeleteSupported = false;
    ({ data, error } = await supabase
      .from("clients")
      .select(selectWithArchive)
      .eq("id", id)
      .maybeSingle());
  }

  if (error && isClientArchiveSchemaMissingError(error.message)) {
    archiveSupported = false;
    softDeleteSupported = false;
    ({ data, error } = await supabase
      .from("clients")
      .select(selectWithoutArchive)
      .eq("id", id)
      .maybeSingle());
  }

  if (error) {
    return { row: null, archiveSupported, error: error.message };
  }

  if (data && softDeleteSupported && (data as { deleted_at?: string | null }).deleted_at) {
    return { row: null, archiveSupported, error: null };
  }

  return {
    row: (data as Record<string, unknown> | null) ?? null,
    archiveSupported,
    error: null,
  };
}

export async function getClientDetailById(
  id: string,
): Promise<ClientDetailRecord | null> {
  const supabase = await createClient();

  let result = await queryClientDetailById(
    supabase,
    id,
    CLIENT_DETAIL_SELECT_WITH_ARCHIVE,
    CLIENT_DETAIL_SELECT,
  );

  if (result.error && isContractStatusSchemaMissingError(result.error)) {
    result = await queryClientDetailById(
      supabase,
      id,
      CLIENT_DETAIL_SELECT_WITHOUT_CONTRACT_STATUS_WITH_ARCHIVE,
      CLIENT_DETAIL_SELECT_WITHOUT_CONTRACT_STATUS,
    );
  }

  if (result.error && isClientDetailSchemaMissingError(result.error)) {
    result = await queryClientDetailById(
      supabase,
      id,
      CLIENT_DETAIL_MINIMAL_SELECT_WITH_ARCHIVE,
      CLIENT_DETAIL_MINIMAL_SELECT,
    );
  }

  if (result.error) throw new Error(result.error);
  if (!result.row) return null;

  return mapClientDetailRow(result.row, result.archiveSupported);
}
