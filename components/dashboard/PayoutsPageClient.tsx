"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Banknote } from "lucide-react";
import { updateFreelancerPayoutStatus } from "@/app/dashboard/finance/payouts/actions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FreelancerPayoutModal } from "@/components/dashboard/FreelancerPayoutModal";
import { FreelancerPayoutStatusBadge } from "@/components/dashboard/FreelancerPayoutStatusBadge";
import { formatCents, formatDate } from "@/lib/dashboard/format";
import type {
  ClientRecord,
  FreelancerPayoutRecord,
  FreelancerRecord,
} from "@/lib/dashboard/types";

interface PayoutsPageClientProps {
  payouts: FreelancerPayoutRecord[];
  freelancers: FreelancerRecord[];
  clients: ClientRecord[];
}

export function PayoutsPageClient({
  payouts,
  freelancers,
  clients,
}: PayoutsPageClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleMarkPaid = (payoutId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateFreelancerPayoutStatus(payoutId, "ausgezahlt");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Status konnte nicht geändert werden",
        );
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <DashboardHeader
          title="Auszahlungen"
          description="Freelancer-Auszahlungen erfassen und offene Forderungen reduzieren."
        />
        <button type="button" onClick={() => setModalOpen(true)} className="dashboard-btn-primary">
          Auszahlung erfassen
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <DataTable
        columns={[
          {
            key: "freelancer",
            header: "Freelancer",
            render: (payout) => payout.freelancer_name ?? "—",
          },
          {
            key: "amount",
            header: "Betrag",
            className: "text-right",
            render: (payout) => formatCents(payout.amount_cents),
          },
          {
            key: "date",
            header: "Datum",
            hideOnMobile: true,
            render: (payout) => formatDate(`${payout.payout_date}T12:00:00`),
          },
          {
            key: "projects",
            header: "Projekte",
            hideOnMobile: true,
            render: (payout) =>
              payout.project_names.length > 0
                ? payout.project_names.join(", ")
                : "—",
          },
          {
            key: "status",
            header: "Status",
            render: (payout) => <FreelancerPayoutStatusBadge status={payout.status} />,
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (payout) =>
              payout.status === "offen" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleMarkPaid(payout.id)}
                  className="dashboard-link text-xs"
                >
                  Als ausgezahlt markieren
                </button>
              ) : null,
          },
        ]}
        data={payouts}
        rowKey={(payout) => payout.id}
        emptyState={
          <EmptyState
            icon={Banknote}
            title="Keine Auszahlungen"
            description="Erfassen Sie die erste Freelancer-Auszahlung."
          />
        }
      />

      <FreelancerPayoutModal
        freelancers={freelancers}
        clients={clients}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
