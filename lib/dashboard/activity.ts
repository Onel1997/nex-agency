import { createClient } from "@/lib/supabase/server";
import type { ActivityLog, LogActivityInput } from "./activity-types";

export async function logActivity(input: LogActivityInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("activity_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
    message: input.message,
  });

  if (error) {
    console.error("Activity log failed:", error.message);
  }
}

export async function getRecentActivities(limit = 8): Promise<ActivityLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select(
      `
      id,
      created_at,
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata,
      message,
      actor:profiles!activity_logs_actor_id_fkey(full_name, email)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    actor: Array.isArray(row.actor) ? row.actor[0] : row.actor,
  })) as ActivityLog[];
}

export async function getActivities(limit = 50): Promise<ActivityLog[]> {
  return getRecentActivities(limit);
}
