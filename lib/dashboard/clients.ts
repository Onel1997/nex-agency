import { createClient } from "@/lib/supabase/server";
import type { ClientRecord } from "./types";

export async function getClients(): Promise<ClientRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      `
      id,
      lead_id,
      company_name,
      contact_name,
      email,
      phone,
      website,
      assigned_to,
      created_at,
      assignee:profiles!clients_assigned_to_fkey(full_name, email)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    lead_id: row.lead_id,
    company_name: row.company_name,
    contact_name: row.contact_name,
    email: row.email,
    phone: row.phone,
    website: row.website,
    assigned_to: row.assigned_to,
    created_at: row.created_at,
    assignee_name: formatAssignee(
      Array.isArray(row.assignee) ? row.assignee[0] : row.assignee,
    ),
  })) as ClientRecord[];
}

function formatAssignee(
  assignee: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!assignee) return null;
  return assignee.full_name?.trim() || assignee.email.split("@")[0];
}
