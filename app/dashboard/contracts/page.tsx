import { requireContractsAccess } from "@/lib/auth/session";
import { getContractsDashboardData } from "@/lib/dashboard/contracts";
import { ContractsPageClient } from "@/components/dashboard/ContractsPageClient";

interface ContractsPageProps {
  searchParams: Promise<{
    status?: string;
    role?: string;
    employment?: string;
    q?: string;
    createFor?: string;
  }>;
}

export default async function ContractsPage({ searchParams }: ContractsPageProps) {
  await requireContractsAccess();
  const params = await searchParams;

  let error: string | null = null;
  let data = null;

  try {
    data = await getContractsDashboardData({
      status: params.status ?? null,
      agencyRole: params.role ?? null,
      employmentType: params.employment ?? null,
      search: params.q ?? null,
    });
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Verträge konnten nicht geladen werden";
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {error ?? "Verträge konnten nicht geladen werden"}
      </div>
    );
  }

  return (
    <ContractsPageClient
      data={data}
      filters={{
        status: params.status ?? "all",
        role: params.role ?? "all",
        employment: params.employment ?? "all",
        search: params.q ?? "",
      }}
      preselectedProfileId={params.createFor ?? null}
    />
  );
}
