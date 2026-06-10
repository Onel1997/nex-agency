export type UserRole =
  | "super_admin"
  | "admin"
  | "sales"
  | "employee"
  | "freelancer";

export type TeamMemberStatus = "pending" | "active" | "deactivated";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: TeamMemberStatus;
  is_active: boolean;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  sales: "Vertrieb",
  employee: "Mitarbeiter",
  freelancer: "Freelancer",
};

export const STATUS_LABELS: Record<TeamMemberStatus, string> = {
  pending: "Ausstehend",
  active: "Aktiv",
  deactivated: "Deaktiviert",
};
