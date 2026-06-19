"use server";

import { revalidatePath } from "next/cache";
import { requireSystemAccess } from "@/lib/auth/session";
import { logActivity } from "@/lib/dashboard/activity";
import {
  getMaintenanceStats,
  isResetConfirmationValid,
  resetOperationalTestData,
} from "@/lib/dashboard/maintenance";
import { createAdminClient } from "@/lib/supabase/admin";

function actorName(profile: { full_name: string | null; email: string }) {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

function revalidateOperationalRoutes() {
  const paths = [
    "/dashboard",
    "/dashboard/leads",
    "/dashboard/clients",
    "/dashboard/appointments",
    "/dashboard/activities",
    "/dashboard/contracts",
    "/dashboard/finance",
    "/dashboard/finance/commissions",
    "/dashboard/finance/freelancers",
    "/dashboard/performance",
    "/dashboard/system/maintenance",
  ];

  for (const path of paths) {
    revalidatePath(path);
  }
}

export async function resetTestData(confirmation: string) {
  const profile = await requireSystemAccess();

  if (!isResetConfirmationValid(confirmation)) {
    throw new Error('Bestätigung fehlgeschlagen. Bitte exakt "RESET TEST DATA" eingeben.');
  }

  const admin = createAdminClient();
  const beforeStats = await getMaintenanceStats(admin);
  const { deleted } = await resetOperationalTestData(admin);

  await logActivity({
    actorId: profile.id,
    action: "maintenance_reset_test_data",
    entityType: "system",
    metadata: {
      deleted,
      before_stats: beforeStats,
    },
    message: `${actorName(profile)} hat operative Testdaten zurückgesetzt`,
  });

  revalidateOperationalRoutes();

  return {
    deleted,
    stats: await getMaintenanceStats(admin),
  };
}
