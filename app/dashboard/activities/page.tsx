import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { requireManagement } from "@/lib/auth/session";
import { getActivities } from "@/lib/dashboard/activity";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default async function ActivitiesPage() {
  await requireManagement();
  const activities = await getActivities(100);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Aktivitäten"
        description="Audit-Protokoll aller wichtigen CRM-Aktionen im Team."
      />
      <div className="glass-card rounded-2xl p-6">
        <ActivityFeed activities={activities} />
      </div>
    </div>
  );
}
