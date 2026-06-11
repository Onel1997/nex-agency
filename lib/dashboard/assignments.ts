/**
 * Assignment field mapping (DB column names).
 *
 * Sprint spec uses "assigned_user_id" — in NexAgency:
 * - Leads:    owner_id
 * - Clients:  responsible_member_id
 * - Appointments: assigned_user_id
 */
export const LEAD_ASSIGNED_USER_COLUMN = "owner_id" as const;
export const CLIENT_ASSIGNED_USER_COLUMN = "responsible_member_id" as const;
export const APPOINTMENT_ASSIGNED_USER_COLUMN = "assigned_user_id" as const;

export const ASSIGNMENT_FIELD_LABEL = "Verantwortlicher Mitarbeiter";
