"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileX2,
  Plus,
  Search,
} from "lucide-react";
import { createContract } from "@/app/dashboard/contracts/actions";
import { CreateContractModal } from "@/components/dashboard/CreateContractModal";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
} from "@/lib/dashboard/contract-constants";
import { formatDate } from "@/lib/dashboard/format";
import type { ContractsDashboardData, TeamContractRecord } from "@/lib/dashboard/types";
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

export function ContractsPageClient({
  data,
  filters,
  preselectedProfileId,
}: ContractsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.search);
  const [createOpen, setCreateOpen] = useState(Boolean(preselectedProfileId));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Verträge"
        description="Vertragsverwaltung für Mitarbeiter, Freelancer und externe Partner."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="dashboard-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Vertrag erstellen
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Aktive Verträge" value={data.stats.active} icon={CheckCircle2} />
        <KpiCard label="Entwürfe" value={data.stats.draft} icon={FileText} />
        <KpiCard label="Gekündigt" value={data.stats.terminated} icon={FileX2} />
        <KpiCard label="Auslaufend" value={data.stats.expiring} icon={AlertTriangle} />
      </div>

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
              { value: "active", label: "Aktiv" },
              { value: "draft", label: "Entwurf" },
              { value: "terminated", label: "Gekündigt" },
              { value: "expired", label: "Ausgelaufen" },
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

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      <DataTable
        data={data.contracts}
        rowKey={(contract) => contract.id}
        onRowClick={(contract) =>
          router.push(`/dashboard/team/${contract.profile_id}?tab=contracts`)
        }
        getRowAriaLabel={(contract) =>
          `Vertrag ${contract.contract_number} für ${contract.profile_name}`
        }
        emptyState={
          <EmptyState
            icon={FileText}
            title="Keine Verträge"
            description="Es wurden keine Verträge für die aktuellen Filter gefunden."
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
            header: "Person",
            render: (contract) => (
              <div>
                <p className="font-medium">{contract.profile_name}</p>
                <p className="text-xs text-muted-soft">{contract.profile_email}</p>
              </div>
            ),
          },
          {
            key: "role",
            header: "Rolle",
            hideOnMobile: true,
            render: (contract) => contract.profile_agency_role_label,
          },
          {
            key: "employment",
            header: "Beschäftigungsart",
            hideOnMobile: true,
            render: (contract) => contract.profile_employment_type_label,
          },
          {
            key: "type",
            header: "Typ",
            hideOnMobile: true,
            render: (contract) => CONTRACT_TYPE_LABELS[contract.contract_type],
          },
          {
            key: "status",
            header: "Status",
            render: (contract) => (
              <ContractStatusBadge status={contract.status} />
            ),
          },
          {
            key: "start",
            header: "Beginn",
            hideOnMobile: true,
            render: (contract) =>
              contract.start_date ? formatDate(contract.start_date) : "—",
          },
          {
            key: "end",
            header: "Ende",
            hideOnMobile: true,
            render: (contract) =>
              contract.end_date ? formatDate(contract.end_date) : "—",
          },
        ]}
      />

      <CreateContractModal
        open={createOpen}
        members={data.members}
        preselectedProfileId={preselectedProfileId}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        pending={pending}
      />
    </div>
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

function ContractStatusBadge({
  status,
}: {
  status: TeamContractRecord["status"];
}) {
  const colors: Record<TeamContractRecord["status"], string> = {
    draft: "bg-slate-500/15 text-slate-200 ring-slate-500/20",
    active: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/20",
    terminated: "bg-amber-500/15 text-amber-200 ring-amber-500/20",
    expired: "bg-red-500/15 text-red-200 ring-red-500/20",
  };

  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${colors[status]}`}
    >
      {CONTRACT_STATUS_LABELS[status]}
    </span>
  );
}
