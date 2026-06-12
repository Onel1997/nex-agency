export type ActivityAction =
  | "lead_created"
  | "lead_updated"
  | "lead_deleted"
  | "lead_status_changed"
  | "lead_assigned"
  | "lead_converted"
  | "client_archived"
  | "client_deleted"
  | "member_invited"
  | "member_updated"
  | "role_changed"
  | "member_deactivated"
  | "member_reactivated"
  | "member_deleted"
  | "appointment_created"
  | "appointment_updated"
  | "appointment_deleted"
  | "appointment_status_changed";

export type ActivityEntityType =
  | "lead"
  | "profile"
  | "client"
  | "team"
  | "appointment";

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
