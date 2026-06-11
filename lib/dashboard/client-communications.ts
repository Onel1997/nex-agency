import { createClient } from "@/lib/supabase/server";
import { isClientHubSchemaMissingError } from "./client-activities";
import type { CommunicationType } from "./constants";
import type { ClientCommunication } from "./types";

function formatMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

export async function getClientCommunications(
  clientId: string,
): Promise<ClientCommunication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_communications")
    .select(
      `
      id,
      client_id,
      author_id,
      communication_type,
      summary,
      occurred_at,
      created_at,
      author:profiles!client_communications_author_id_fkey(full_name, email)
    `,
    )
    .eq("client_id", clientId)
    .order("occurred_at", { ascending: false });

  if (error) {
    if (isClientHubSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const author = Array.isArray(row.author) ? row.author[0] : row.author;
    return {
      id: row.id as string,
      client_id: row.client_id as string,
      author_id: row.author_id as string,
      communication_type: row.communication_type as CommunicationType,
      summary: row.summary as string,
      occurred_at: row.occurred_at as string,
      created_at: row.created_at as string,
      author_name: formatMemberName(
        author as { full_name: string | null; email: string } | null,
      ),
    };
  });
}
