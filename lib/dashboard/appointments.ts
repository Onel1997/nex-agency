import { isManagement } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Appointment, AppointmentStats } from "./types";

function formatAssignee(
  assignee: { full_name: string | null; email: string } | null | undefined,
): string | null {
  if (!assignee) return null;
  return assignee.full_name?.trim() || assignee.email.split("@")[0];
}

const APPOINTMENT_SELECT = `
  *,
  assignee:profiles!appointments_assigned_user_id_fkey(full_name, email),
  lead:leads!appointments_lead_id_fkey(company_name)
`;

function mapAppointmentRow(row: Record<string, unknown>): Appointment {
  const assignee = Array.isArray(row.assignee) ? row.assignee[0] : row.assignee;
  const lead = Array.isArray(row.lead) ? row.lead[0] : row.lead;

  return {
    ...(row as unknown as Appointment),
    assignee_name: formatAssignee(
      assignee as { full_name: string | null; email: string } | null,
    ),
    lead_company_name:
      (lead as { company_name: string } | null)?.company_name ?? null,
  };
}

export async function getAppointmentsInRange(
  start: Date,
  end: Date,
): Promise<Appointment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .gte("start_time", start.toISOString())
    .lte("start_time", end.toISOString())
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapAppointmentRow(row as Record<string, unknown>));
}

export async function getAllAppointments(): Promise<Appointment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapAppointmentRow(row as Record<string, unknown>));
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapAppointmentRow(data as Record<string, unknown>);
}

export async function getAppointmentsForLead(
  leadId: string,
  upcomingOnly = false,
): Promise<Appointment[]> {
  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("lead_id", leadId)
    .order("start_time", { ascending: true });

  if (upcomingOnly) {
    query = query.gte("start_time", new Date().toISOString());
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapAppointmentRow(row as Record<string, unknown>));
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export async function getAppointmentStats(): Promise<AppointmentStats> {
  const profile = await getProfile();
  if (!profile) {
    return {
      todayCount: 0,
      weekCount: 0,
      confirmedCount: 0,
      completedCount: 0,
    };
  }

  const supabase = await createClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const { data, error } = await supabase
    .from("appointments")
    .select("start_time, status");

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  let todayCount = 0;
  let weekCount = 0;
  let confirmedCount = 0;
  let completedCount = 0;

  for (const row of rows) {
    const startTime = new Date(row.start_time);
    if (startTime >= todayStart && startTime <= todayEnd) todayCount += 1;
    if (startTime >= weekStart && startTime <= weekEnd) weekCount += 1;
    if (row.status === "confirmed") confirmedCount += 1;
    if (row.status === "completed") completedCount += 1;
  }

  return { todayCount, weekCount, confirmedCount, completedCount };
}

export async function getAppointmentCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getTeamAppointmentCounts(): Promise<Map<string, number>> {
  const profile = await getProfile();
  if (!profile || !isManagement(profile)) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("assigned_user_id");

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.assigned_user_id, (counts.get(row.assigned_user_id) ?? 0) + 1);
  }
  return counts;
}
