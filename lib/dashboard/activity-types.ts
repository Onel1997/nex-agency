export type ActivityAction =
  | "lead_created"
  | "lead_updated"
  | "lead_deleted"
  | "lead_status_changed"
  | "lead_assigned"
  | "member_invited"
  | "role_changed"
  | "member_deactivated"
  | "member_reactivated"
  | "member_deleted";

export type ActivityEntityType =
  | "lead"
  | "profile"
  | "client"
  | "team";

export interface ActivityLog {
  id: string;
  created_at: string;
  actor_id: string | null;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  message: string;
  actor?: {
    full_name: string | null;
    email: string;
  } | null;
}

export interface LogActivityInput {
  actorId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  message: string;
}
