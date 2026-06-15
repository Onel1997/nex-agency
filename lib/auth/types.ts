/** @deprecated Legacy synced column — use agency_role instead. */
export type UserRole =
  | "super_admin"
  | "admin"
  | "sales_manager"
  | "employee"
  | "freelancer";

export type EmploymentType = "employee" | "freelancer" | "external_partner";

export type AgencyRole =
  | "owner"
  | "admin"
  | "sales_manager"
  | "setter"
  | "closer"
  | "project_manager"
  | "customer_success";

export type TeamMemberStatus = "pending" | "active" | "deactivated";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  /** @deprecated Synced legacy column — prefer agency_role. */
  role: UserRole;
  employment_type: EmploymentType;
  agency_role: AgencyRole;
  status: TeamMemberStatus;
  is_active: boolean;
  activated_at: string | null;
  /** @deprecated Synced max(setter, closer) — prefer explicit rates. */
  commission_rate: number;
  setter_commission_rate: number;
  closer_commission_rate: number;
  retainer_commission_rate: number;
  retainer_commission_months: number;
  created_at: string;
  updated_at: string;
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  employee: "Mitarbeiter",
  freelancer: "Freelancer",
  external_partner: "Externer Partner",
};

export const AGENCY_ROLE_LABELS: Record<AgencyRole, string> = {
  owner: "Owner",
  admin: "Admin",
  sales_manager: "Sales Manager",
  setter: "Setter",
  closer: "Closer",
  project_manager: "Projektmanager",
  customer_success: "Customer Success",
};

/** @deprecated Use AGENCY_ROLE_LABELS */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Owner",
  admin: "Admin",
  sales_manager: "Sales Manager",
  employee: "Mitarbeiter",
  freelancer: "Freelancer",
};

export const STATUS_LABELS: Record<TeamMemberStatus, string> = {
  pending: "Ausstehend",
  active: "Aktiv",
  deactivated: "Deaktiviert",
};
