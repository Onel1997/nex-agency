"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  Building2,
  CheckCircle2,
  FileText,
  FileX2,
  PenLine,
  Plus,
  Search,
  Send,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { createContract, deleteContract, fetchContractDetails } from "@/app/dashboard/contracts/actions";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { ContractDetailPanel } from "@/components/dashboard/ContractDetailPanel";
import { ContractStatusBadge } from "@/components/dashboard/ContractStatusBadge";
import { CreateContractModal } from "@/components/dashboard/CreateContractModal";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  CONTRACT_OVERVIEW_TABS,
  CONTRACT_OVERVIEW_TAB_LABELS,
  CONTRACT_TYPE_LABELS,
  type ContractOverviewTab,
} from "@/lib/dashboard/contract-constants";
import { canDeleteContract, getContractDeleteDialogTitle } from "@/lib/dashboard/contract-lifecycle";
import { formatCents, formatDate } from "@/lib/dashboard/format";
import type {
  ContractWithDetails,
  ContractsDashboardData,
  CustomerContractOverviewRecord,
  TeamContractRecord,
} from "@/lib/dashboard/types";
import { AGENCY_ROLES, EMPLOYMENT_TYPES } from "@/lib/auth/permissions";
import { getAgencyRoleLabel, getEmploymentTypeLabel } from "@/lib/auth/roles";

interface ContractsPageClientProps {
  data: ContractsDashboardData;
  filters: {
    status: string;
    role: string;
    employment: string;
    search: string;
  };
  preselectedProfileId: string | null;
}

const TAB_ICONS: Record<ContractOverviewTab, typeof Users> = {
  kunden: Building2,
  freelancer: UserRound,
  mitarbeiter: Users,
};

export function ContractsPageClient({
  data,
  filters,
  preselectedProfileId,
}: ContractsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.search);
  const [createOpen, setCreateOpen] = useState(Boolean(preselectedProfileId));
  const [selectedContract, setSelectedContract] = useState<ContractWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamContractRecord | null>(null);
  const [pending, startTransition] = useTransition();

  const activeTab = data.activeTab;
  const isTeamTab = activeTab !== "kunden";

  const setTab = useCallback(
    (tab: ContractOverviewTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(`/dashboard/contracts?${params.toString()}`);
    },
    [router, searchParams],
  );

  const updateFilters = useCallback(
    (next: Partial<typeof filters>) => {
      const params = new URLSearchParams(searchParams.toString());
      const merged = { ...filters, ...next };

      if (merged.status && merged.status !== "all") params.set("status", merged.status);
      else params.delete("status");

      if (merged.role && merged.role !== "all") params.set("role", merged.role);
      else params.delete("role");

      if (merged.employment && merged.employment !== "all") {
        params.set("employment", merged.employment);
      } else {
        params.delete("employment");
      }

      if (merged.search) params.set("q", merged.search);
      else params.delete("q");

      const query = params.toString();
      router.push(query ? `/dashboard/contracts?${query}` : "/dashboard/contracts");
    },
    [filters, router, searchParams],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: search.trim() });
  };

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

  const openContractDetail = (contractId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const contract = await fetchContractDetails(contractId);
        setSelectedContract(contract);
        setDetailOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Vertrag konnte nicht geladen werden");
      }
    });
  };

  const refreshDetail = () => {
    if (!selectedContract) {
      router.refresh();
      return;
    }
    startTransition(async () => {
      try {
        const contract = await fetchContractDetails(selectedContract.id);
        setSelectedContract(contract);
        router.refresh();
      } catch {
        router.refresh();
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteContract(deleteTarget.id);
        if (selectedContract?.id === deleteTarget.id) {
          setDetailOpen(false);
          setSelectedContract(null);
        }
        setDeleteTarget(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
      }
    });
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Verträge"
        description="Kunden-, Freelancer- und Mitarbeiter-Verträge zentral verwalten."
        actions={
          isTeamTab ? (
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Aktiv" value={data.stats.active} icon={CheckCircle2} />
        <KpiCard label="Entwurf" value={data.stats.draft} icon={FileText} />
        <KpiCard label="Versendet" value={data.stats.sent} icon={Send} />
        <KpiCard label="Unterschrieben" value={data.stats.signed} icon={PenLine} />
        <KpiCard label="Gekündigt" value={data.stats.terminated} icon={FileX2} />
      </div>

      <div className="flex flex-wrap gap-2">
        {CONTRACT_OVERVIEW_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab];
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/25"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {CONTRACT_OVERVIEW_TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>

      {isTeamTab && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <form onSubmit={handleSearchSubmit} className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, E-Mail oder Vertragsnummer…"
              className="dashboard-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
            />
          </form>

          <div className="flex flex-wrap gap-2">
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(value) => updateFilters({ status: value })}
              options={[
                { value: "all", label: "Alle Status" },
                { value: "draft", label: "Entwurf" },
                { value: "sent", label: "Versendet" },
                { value: "signed", label: "Unterschrieben" },
                { value: "active", label: "Aktiv" },
                { value: "terminated", label: "Gekündigt" },
                { value: "expired", label: "Ausgelaufen" },
                { value: "archived", label: "Archiviert" },
                { value: "expiring", label: "Auslaufend" },
              ]}
            />
            <FilterSelect
              label="Rolle"
              value={filters.role}
              onChange={(value) => updateFilters({ role: value })}
              options={[
                { value: "all", label: "Alle Rollen" },
                ...AGENCY_ROLES.map((role) => ({
                  value: role,
                  label: getAgencyRoleLabel(role),
                })),
              ]}
            />
            <FilterSelect
              label="Beschäftigung"
              value={filters.employment}
              onChange={(value) => updateFilters({ employment: value })}
              options={[
                { value: "all", label: "Alle Arten" },
                ...EMPLOYMENT_TYPES.map((type) => ({
                  value: type,
                  label: getEmploymentTypeLabel(type),
                })),
              ]}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      {activeTab === "kunden" ? (
        <CustomerContractsTable contracts={data.customerContracts} />
      ) : (
        <TeamContractsTable
          contracts={data.contracts}
          tab={activeTab}
          onOpen={openContractDetail}
          onDelete={setDeleteTarget}
        />
      )}

      <CreateContractModal
        open={createOpen}
        members={data.members}
        preselectedProfileId={preselectedProfileId}
        defaultCategory={activeTab === "mitarbeiter" ? "employee" : "freelancer"}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        pending={pending}
      />

      <ContractDetailPanel
        contract={selectedContract}
        members={data.members}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedContract(null);
        }}
        onRefresh={refreshDetail}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={
          deleteTarget
            ? getContractDeleteDialogTitle(deleteTarget.status)
            : "Vertrag wirklich löschen?"
        }
        confirmLabel="Löschen"
        variant="danger"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

function TeamContractsTable({
  contracts,
  tab,
  onOpen,
  onDelete,
}: {
  contracts: TeamContractRecord[];
  tab: ContractOverviewTab;
  onOpen: (contractId: string) => void;
  onDelete: (contract: TeamContractRecord) => void;
}) {
  return (
    <DataTable
      data={contracts}
      rowKey={(contract) => contract.id}
      onRowClick={(contract) => onOpen(contract.id)}
      getRowAriaLabel={(contract) =>
        `Vertrag ${contract.contract_number} für ${contract.profile_name}`
      }
      emptyState={
        <EmptyState
          icon={FileText}
          title={`Keine ${CONTRACT_OVERVIEW_TAB_LABELS[tab]}`}
          description="Erstellen Sie einen neuen Vertrag für diese Kategorie."
        />
      }
      columns={[
        {
          key: "number",
          header: "Vertragsnummer",
          render: (contract) => (
            <span className="font-medium text-foreground">{contract.contract_number}</span>
          ),
        },
        {
          key: "person",
          header: "Name",
          render: (contract) => (
            <div>
              <p className="font-medium">{contract.profile_name}</p>
              <p className="text-xs text-muted-soft">{contract.profile_agency_role_label}</p>
            </div>
          ),
        },
        {
          key: "type",
          header: "Typ",
          hideOnMobile: true,
          render: (contract) => CONTRACT_TYPE_LABELS[contract.contract_type],
        },
        {
          key: "terms",
          header: tab === "mitarbeiter" ? "Gehalt" : "Provision",
          hideOnMobile: true,
          render: (contract) =>
            tab === "mitarbeiter"
              ? contract.monthly_salary_cents != null
                ? formatCents(contract.monthly_salary_cents)
                : "—"
              : contract.setup_commission_rate != null
                ? `${contract.setup_commission_rate} % Setup`
                : contract.commission_rate != null
                  ? `${contract.commission_rate} %`
                  : "—",
        },
        {
          key: "status",
          header: "Status",
          render: (contract) => <ContractStatusBadge status={contract.status} />,
        },
        {
          key: "start",
          header: "Beginn",
          hideOnMobile: true,
          render: (contract) =>
            contract.start_date ? formatDate(contract.start_date) : "—",
        },
        {
          key: "pdf",
          header: "PDF",
          hideOnMobile: true,
          render: (contract) =>
            contract.pdf_url ? (
              <a
                href={`/api/contracts/${contract.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="dashboard-link text-xs"
              >
                Download
              </a>
            ) : (
              "—"
            ),
        },
        {
          key: "actions",
          header: "Aktionen",
          render: (contract) =>
            canDeleteContract(contract.status) ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(contract);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-200 ring-1 ring-red-500/25 transition-colors hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Löschen
              </button>
            ) : (
              "—"
            ),
        },
      ]}
    />
  );
}

function CustomerContractsTable({
  contracts,
}: {
  contracts: CustomerContractOverviewRecord[];
}) {
  const router = useRouter();

  return (
    <DataTable
      data={contracts}
      rowKey={(contract) => contract.id}
      onRowClick={(contract) =>
        router.push(`/dashboard/clients/${contract.id}?tab=contracts`)
      }
      getRowAriaLabel={(contract) => `Kundenvertrag ${contract.company_name}`}
      emptyState={
        <EmptyState
          icon={Building2}
          title="Keine Kundenverträge"
          description="Kunden mit Vertragsstart-Datum erscheinen hier."
        />
      }
      columns={[
        {
          key: "company",
          header: "Kunde",
          render: (contract) => (
            <Link
              href={`/dashboard/clients/${contract.id}?tab=contracts`}
              onClick={(event) => event.stopPropagation()}
              className="font-medium dashboard-link"
            >
              {contract.company_name}
            </Link>
          ),
        },
        {
          key: "status",
          header: "Status",
          render: (contract) => contract.contract_status_label,
        },
        {
          key: "setup",
          header: "Setup",
          hideOnMobile: true,
          render: (contract) => contract.setup_fee_label,
        },
        {
          key: "retainer",
          header: "Retainer",
          hideOnMobile: true,
          render: (contract) => contract.monthly_revenue_label,
        },
        {
          key: "start",
          header: "Vertragsbeginn",
          hideOnMobile: true,
          render: (contract) =>
            contract.contract_start_date
              ? formatDate(contract.contract_start_date)
              : "—",
        },
        {
          key: "billing",
          header: "Abrechnung",
          hideOnMobile: true,
          render: (contract) =>
            contract.auto_invoice_enabled ? "Automatisch" : "Manuell",
        },
      ]}
    />
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-soft">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="dashboard-input rounded-xl px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
