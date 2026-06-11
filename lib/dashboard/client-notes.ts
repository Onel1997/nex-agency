import { createClient } from "@/lib/supabase/server";
import { isClientHubSchemaMissingError } from "./client-activities";
import type { ClientNote } from "./types";

function formatMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

export async function getClientNotes(clientId: string): Promise<ClientNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .select(
      `
      id,
      client_id,
      author_id,
      content,
      created_at,
      updated_at,
      author:profiles!client_notes_author_id_fkey(full_name, email)
    `,
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

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
      content: row.content as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      author_name: formatMemberName(
        author as { full_name: string | null; email: string } | null,
      ),
    };
  });
}
