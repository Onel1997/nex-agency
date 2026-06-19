import { requireSystemAccess } from "@/lib/auth/session";
import { getMaintenanceAuditLogs } from "@/lib/dashboard/activity";
import { getMaintenanceStats } from "@/lib/dashboard/maintenance";
import { createAdminClient } from "@/lib/supabase/admin";
import { MaintenancePageClient } from "@/components/dashboard/MaintenancePageClient";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default async function MaintenancePage() {
  await requireSystemAccess();

  const admin = createAdminClient();
  const [stats, auditLogs] = await Promise.all([
    getMaintenanceStats(admin),
    getMaintenanceAuditLogs(10),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Wartung"
        description="Owner-only Wartungsbereich für Datenbankstatistiken und kontrolliertes Zurücksetzen operativer Testdaten."
      />
      <MaintenancePageClient stats={stats} auditLogs={auditLogs} />
    </div>
  );
}
