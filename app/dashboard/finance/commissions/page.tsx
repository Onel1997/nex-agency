import { requireFinanceAccess } from "@/lib/auth/session";
import { getCommissionCenterData } from "@/lib/dashboard/commission-center";
import { CommissionsPageClient } from "@/components/dashboard/CommissionsPageClient";

export default async function CommissionsPage() {
  await requireFinanceAccess();

  let error: string | null = null;
  let data = null;

  try {
    data = await getCommissionCenterData();
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Provisionen konnten nicht geladen werden";
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error ?? "Provisionen konnten nicht geladen werden"}
      </div>
    );
  }

  return <CommissionsPageClient data={data} />;
}
