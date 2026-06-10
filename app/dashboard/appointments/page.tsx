import { AppointmentsPageClient } from "@/components/dashboard/AppointmentsPageClient";
import { canAssignAppointments } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { getAllAppointments } from "@/lib/dashboard/appointments";
import { getLeads } from "@/lib/dashboard/leads";
import { getAssignableTeamMembers } from "@/lib/dashboard/team";
import type { Appointment, Lead } from "@/lib/dashboard/types";

export default async function AppointmentsPage() {
  const profile = await getProfile();
  if (!profile) return null;

  let error: string | null = null;
  let appointments: Appointment[] = [];
  let leads: Lead[] = [];

  try {
    [appointments, leads] = await Promise.all([
      getAllAppointments(),
      getLeads(),
    ]);
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Termine konnten nicht geladen werden";
  }

  const teamMembers = await getAssignableTeamMembers();

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error}
      </div>
    );
  }

  return (
    <AppointmentsPageClient
      appointments={appointments}
      leads={leads}
      teamMembers={teamMembers}
      canAssign={canAssignAppointments(profile)}
      currentUserId={profile.id}
    />
  );
}
