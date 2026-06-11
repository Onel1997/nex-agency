import { createClient } from "@/lib/supabase/server";
import type { ClientActivityType } from "./constants";
import type { ClientActivity } from "./types";

function formatMemberName(
  member: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!member) return null;
  return member.full_name?.trim() || member.email.split("@")[0];
}

export interface LogClientActivityInput {
  clientId: string;
  actorId: string | null;
  activityType: ClientActivityType;
  description: string;
  metadata?: Record<string, unknown>;
}

export function isClientHubSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") &&
    (normalized.includes("client_activities") ||
      normalized.includes("client_notes") ||
      normalized.includes("client_files") ||
      normalized.includes("client_communications") ||
      normalized.includes("invoices"))
  );
}

export async function logClientActivity(
  input: LogClientActivityInput,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("client_activities").insert({
    client_id: input.clientId,
    actor_id: input.actorId,
    activity_type: input.activityType,
    description: input.description,
    metadata: input.metadata ?? {},
  });

  if (error && !isClientHubSchemaMissingError(error.message)) {
    console.error("Client activity log failed:", error.message);
  }
}

export async function getClientActivities(
  clientId: string,
): Promise<ClientActivity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_activities")
    .select(
      `
      id,
      client_id,
      actor_id,
      activity_type,
      description,
      metadata,
      created_at,
      actor:profiles!client_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isClientHubSchemaMissingError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
    return {
      id: row.id as string,
      client_id: row.client_id as string,
      actor_id: (row.actor_id as string | null) ?? null,
      activity_type: row.activity_type as ClientActivityType,
      description: row.description as string,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      created_at: row.created_at as string,
      actor_name: formatMemberName(
        actor as { full_name: string | null; email: string } | null,
      ),
    };
  });
}
