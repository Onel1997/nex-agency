import { createClient } from "@/lib/supabase/server";
import type { ClientRecord } from "./types";

function formatMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

const CLIENT_SELECT = `
  id,
  lead_id,
  company_name,
  contact_name,
  email,
  phone,
  website,
  responsible_member_id,
  contract_value_cents,
  monthly_retainer_cents,
  one_time_project_value_cents,
  currency,
  created_at,
  responsible_member:profiles!clients_responsible_member_id_fkey(full_name, email)
`;

function mapClientRow(row: Record<string, unknown>): ClientRecord {
  const responsibleMember = Array.isArray(row.responsible_member)
    ? row.responsible_member[0]
    : row.responsible_member;

  return {
    id: row.id as string,
    lead_id: row.lead_id as string,
    company_name: row.company_name as string,
    contact_name: (row.contact_name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    responsible_member_id: (row.responsible_member_id as string | null) ?? null,
    contract_value_cents: (row.contract_value_cents as number | null) ?? null,
    monthly_retainer_cents: (row.monthly_retainer_cents as number | null) ?? null,
    one_time_project_value_cents:
      (row.one_time_project_value_cents as number | null) ?? null,
    currency: (row.currency as string) ?? "EUR",
    created_at: row.created_at as string,
    responsible_member_name: formatMemberName(
      responsibleMember as { full_name: string | null; email: string } | null,
    ),
  };
}

export async function getClients(): Promise<ClientRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapClientRow(row as Record<string, unknown>));
}

export async function getRecentClients(limit = 5): Promise<ClientRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapClientRow(row as Record<string, unknown>));
}

export async function getClientById(id: string): Promise<ClientRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapClientRow(data as Record<string, unknown>);
}
