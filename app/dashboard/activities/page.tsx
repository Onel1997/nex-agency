import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { requireAdmin } from "@/lib/auth/session";
import { getActivities } from "@/lib/dashboard/activity";
import type { ActivityLog } from "@/lib/dashboard/activity-types";

export default async function ActivitiesPage() {
  await requireAdmin();

  let activities: ActivityLog[] = [];
  let error: string | null = null;

  try {
    activities = await getActivities(100);
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Aktivitäten konnten nicht geladen werden";
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Aktivitäten"
        description="Chronologischer Verlauf aller Team-Aktionen im CRM."
      />

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <div className="glass-card rounded-2xl p-6">
        <ActivityFeed activities={activities} />
      </div>
    </div>
  );
}
