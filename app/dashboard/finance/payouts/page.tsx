import { PayoutCenterPageClient } from "@/components/dashboard/PayoutCenterPageClient";
import {
  DEFAULT_PAYOUT_CENTER_TAB,
  PAYOUT_DERIVED_STATUSES,
  type PayoutDerivedStatus,
} from "@/lib/dashboard/payout-center-constants";
import { getPayoutCenterData } from "@/lib/dashboard/payout-center";

interface PayoutsPageProps {
  searchParams: Promise<{ status?: string }>;
}

function resolveStatusParam(value: string | undefined): PayoutDerivedStatus {
  if (value && PAYOUT_DERIVED_STATUSES.includes(value as PayoutDerivedStatus)) {
    return value as PayoutDerivedStatus;
  }
  return DEFAULT_PAYOUT_CENTER_TAB;
}

export default async function PayoutsPage({ searchParams }: PayoutsPageProps) {
  const params = await searchParams;
  const status = resolveStatusParam(params.status);

  try {
    const data = await getPayoutCenterData(status);
    return <PayoutCenterPageClient data={data} />;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Auszahlungen konnten nicht geladen werden";

    return (
      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
        {message}
      </div>
    );
  }
}
