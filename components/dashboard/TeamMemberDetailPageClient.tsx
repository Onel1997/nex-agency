"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Download,
  Eye,
  FileText,
  LayoutDashboard,
  Plus,
  User,
} from "lucide-react";
import { createContract } from "@/app/dashboard/contracts/actions";
import { CreateContractModal } from "@/components/dashboard/CreateContractModal";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  AGENCY_ROLE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  STATUS_LABELS,
} from "@/lib/auth/types";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
} from "@/lib/dashboard/contract-constants";
import { COMMISSION_ENTRY_STATUS_LABELS } from "@/lib/dashboard/commission-constants";
import { formatCents, formatDate, formatPercent } from "@/lib/dashboard/format";
import { KpiCard } from "@/components/dashboard/KpiCard";
import type { TeamMemberDetailData } from "@/lib/dashboard/types";

const BASE_TABS = [
  { id: "overview", label: "Übersicht", icon: LayoutDashboard },
  { id: "contracts", label: "Verträge", icon: FileText },
] as const;

const COMMISSIONS_TAB = {
  id: "commissions",
  label: "Provisionen",
  icon: Banknote,
} as const;

type BaseTabId = (typeof BASE_TABS)[number]["id"];
type TabId = BaseTabId | typeof COMMISSIONS_TAB.id;

interface TeamMemberDetailPageClientProps {
  data: TeamMemberDetailData;
}

export function TeamMemberDetailPageClient({
  data,
}: TeamMemberDetailPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "overview";
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { member, contracts, commissionSummary } = data;

  const showCommissionsTab =
    member.agency_role === "setter" ||
    member.agency_role === "closer" ||
    (commissionSummary?.entries.length ?? 0) > 0;

  const tabs = showCommissionsTab
    ? [...BASE_TABS, COMMISSIONS_TAB]
    : [...BASE_TABS];

  const setTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleCreate = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await createContract(formData);
        setCreateOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erstellen fehlgeschlagen");
      }
    });
  };

  const displayName = member.full_name?.trim() || member.email.split("@")[0];

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/team"
        className="dashboard-link inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Team
      </Link>

      <DashboardHeader
        title={displayName}
        description={`Team-Akte — ${member.email}`}
        actions={
          activeTab === "contracts" ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="dashboard-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Vertrag erstellen
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/25"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      {activeTab === "overview" && <OverviewTab member={member} />}

      {activeTab === "contracts" && (
        <ContractsTab contracts={contracts} onOpenPdf={openContractPdf} />
      )}

      {activeTab === "commissions" && commissionSummary && (
        <CommissionsTab
          memberId={member.id}
          summary={commissionSummary}
        />
      )}

      <CreateContractModal
        open={createOpen}
        members={[member]}
        preselectedProfileId={member.id}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        pending={pending}
      />
    </div>
  );
}

function OverviewTab({ member }: { member: TeamMemberDetailData["member"] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InfoCard title="Stammdaten" icon={User}>
        <InfoRow label="E-Mail" value={member.email} />
        <InfoRow label="Name" value={member.full_name?.trim() || "—"} />
        <InfoRow
          label="Agenturrolle"
          value={AGENCY_ROLE_LABELS[member.agency_role]}
        />
        <InfoRow
          label="Beschäftigungsart"
          value={EMPLOYMENT_TYPE_LABELS[member.employment_type]}
        />
        <InfoRow label="Status" value={STATUS_LABELS[member.status]} />
      </InfoCard>

      <InfoCard title="Provisionen" icon={FileText}>
        <InfoRow
          label="Setter Provision"
          value={formatPercent(member.setter_commission_rate)}
        />
        <InfoRow
          label="Closer Provision"
          value={formatPercent(member.closer_commission_rate)}
        />
        <InfoRow
          label="Aktiv seit"
          value={member.activated_at ? formatDate(member.activated_at) : "—"}
        />
      </InfoCard>
    </div>
  );
}

function ContractsTab({
  contracts,
  onOpenPdf,
}: {
  contracts: TeamMemberDetailData["contracts"];
  onOpenPdf: (contractId: string) => void;
}) {
  return (
    <DataTable
      data={contracts}
      rowKey={(contract) => contract.id}
      emptyState={
        <EmptyState
          icon={FileText}
          title="Keine Verträge"
          description="Für diese Person wurden noch keine Verträge angelegt."
        />
      }
      columns={[
        {
          key: "number",
          header: "Vertragsnummer",
          render: (contract) => (
            <span className="font-medium">{contract.contract_number}</span>
          ),
        },
        {
          key: "type",
          header: "Typ",
          render: (contract) => CONTRACT_TYPE_LABELS[contract.contract_type],
        },
        {
          key: "status",
          header: "Status",
          render: (contract) => CONTRACT_STATUS_LABELS[contract.status],
        },
        {
          key: "start",
          header: "Beginn",
          render: (contract) =>
            contract.start_date ? formatDate(contract.start_date) : "—",
        },
        {
          key: "end",
          header: "Ende",
          render: (contract) =>
            contract.end_date ? formatDate(contract.end_date) : "—",
        },
        {
          key: "actions",
          header: "Aktionen",
          render: (contract) => (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onOpenPdf(contract.id)}
                className="dashboard-btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
              >
                <Eye className="h-3.5 w-3.5" />
                Öffnen
              </button>
              <a
                href={`/api/contracts/${contract.id}/pdf`}
                download={`${contract.contract_number}.pdf`}
                className="dashboard-btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            </div>
          ),
        },
      ]}
    />
  );
}

function openContractPdf(contractId: string) {
  window.open(`/api/contracts/${contractId}/pdf`, "_blank", "noopener,noreferrer");
}

function CommissionsTab({
  memberId,
  summary,
}: {
  memberId: string;
  summary: NonNullable<TeamMemberDetailData["commissionSummary"]>;
}) {
  const memberEntries = summary.entries.map((entry) => {
    const isSetter = entry.setter_id === memberId;
    const isCloser = entry.closer_id === memberId;
    const roleAmount = isSetter
      ? entry.setter_commission_cents
      : isCloser
        ? entry.closer_commission_cents
        : 0;
    const roleLabel = isSetter ? "Setter" : isCloser ? "Closer" : "—";

    return { ...entry, roleAmount, roleLabel };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Verdient" value={formatCents(summary.earnedCents)} icon={Banknote} />
        <KpiCard label="Ausbezahlt" value={formatCents(summary.paidCents)} icon={Banknote} />
        <KpiCard label="Offen" value={formatCents(summary.openCents)} icon={Banknote} />
      </div>

      <DataTable
        data={memberEntries}
        rowKey={(entry) => entry.id}
        emptyState={
          <EmptyState
            icon={Banknote}
            title="Keine Provisionen"
            description="Provisionen entstehen, wenn bezahlte Setup- oder Projektrechnungen vorliegen."
          />
        }
        columns={[
          {
            key: "client",
            header: "Kunde",
            render: (entry) => entry.client_name,
          },
          {
            key: "role",
            header: "Rolle",
            render: (entry) => entry.roleLabel,
          },
          {
            key: "amount",
            header: "Betrag",
            render: (entry) => formatCents(entry.roleAmount),
          },
          {
            key: "status",
            header: "Status",
            render: (entry) => COMMISSION_ENTRY_STATUS_LABELS[entry.status],
          },
          {
            key: "date",
            header: "Datum",
            render: (entry) => formatDate(entry.created_at),
          },
        ]}
      />
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-violet-300" />
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          {title}
        </h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
