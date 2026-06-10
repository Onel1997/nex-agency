import type { TeamMemberStatus, UserRole } from "@/lib/auth/types";
import type { AcquiredBy, LeadStatus } from "./constants";

export interface Lead {
  id: string;
  created_at: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: LeadStatus;
  acquired_by: AcquiredBy | null;
  assigned_to: string | null;
  notes: string | null;
  assignee_name?: string | null;
}

export type LeadInsert = Omit<Lead, "id" | "created_at" | "assignee_name">;
export type LeadUpdate = Partial<LeadInsert>;

export interface DashboardStats {
  leadsCount: number;
  appointmentsCount: number;
  clientsCount: number;
  pipelineCount: number;
  teamCount?: number;
}

export interface TeamMemberStats {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  leadsCount: number;
  appointmentsCount: number;
  clientsCount: number;
}

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: TeamMemberStatus;
  created_at: string;
  is_active: boolean;
  activated_at: string | null;
}

export interface ClientRecord {
  id: string;
  lead_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  assigned_to: string | null;
  created_at: string;
  assignee_name: string | null;
}

export interface AppointmentRow extends Lead {
  assignee_name: string | null;
}
