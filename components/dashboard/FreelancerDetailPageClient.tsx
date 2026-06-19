"use client";

import type { ReactNode } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Receipt,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { updateFreelancerBillingProfile } from "@/app/dashboard/finance/freelancers/actions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/types";
import { formatCents, formatDate } from "@/lib/dashboard/format";
import type { FreelancerDetailData } from "@/lib/dashboard/types";

const TABS = [
  { id: "overview", label: "Übersicht", icon: LayoutDashboard },
  { id: "masterdata", label: "Stammdaten", icon: User },
  { id: "payouts", label: "Auszahlungen", icon: Banknote },
  { id: "invoices", label: "Rechnungen", icon: Receipt },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface FreelancerDetailPageClientProps {
  data: FreelancerDetailData;
}

export function FreelancerDetailPageClient({ data }: FreelancerDetailPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "overview";
  const { freelancer, billingProfile, payouts, invoices } = data;

  const setTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/finance/freelancers"
        className="dashboard-link inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Freelancern
      </Link>

      <DashboardHeader
        title={freelancer.name}
        description="Freelancer-Center — Stammdaten, Performance und Abrechnungen"
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
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

      {activeTab === "overview" && (
        <OverviewTab freelancer={freelancer} payouts={payouts} invoices={invoices} />
      )}

      {activeTab === "masterdata" && (
        <MasterDataTab
          freelancer={freelancer}
          billingProfile={billingProfile}
        />
      )}

      {activeTab === "payouts" && <PayoutsTab payouts={payouts} />}

      {activeTab === "invoices" && <InvoicesTab invoices={invoices} />}
    </div>
  );
}

function OverviewTab({
  freelancer,
  payouts,
  invoices,
}: {
  freelancer: FreelancerDetailData["freelancer"];
  payouts: FreelancerDetailData["payouts"];
  invoices: FreelancerDetailData["invoices"];
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Projekte"
          value={String(freelancer.assigned_project_count)}
          icon={FolderKanban}
        />
        <KpiCard
          label="Projektvolumen"
          value={formatCents(freelancer.project_volume_cents)}
          icon={Briefcase}
        />
        <KpiCard
          label="Verdient"
          value={formatCents(freelancer.total_earned_cents)}
          icon={TrendingUp}
        />
        <KpiCard
          label="Ausgezahlt"
          value={formatCents(freelancer.total_paid_out_cents)}
          icon={Banknote}
        />
        <KpiCard
          label="Offen"
          value={formatCents(freelancer.outstanding_cents)}
          icon={Wallet}
        />
      </div>

      <div className="glass-card rounded-2xl p-5 text-sm text-muted">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          Stammdaten
        </h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Name" value={freelancer.name} />
          <Info label="E-Mail" value={freelancer.email} />
          <Info
            label="Rolle"
            value={
              freelancer.role
                ? ROLE_LABELS[freelancer.role as UserRole] ?? freelancer.role
                : "Freelancer"
            }
          />
          <Info
            label="Status"
            value={freelancer.profile_status === "active" ? "Aktiv" : freelancer.profile_status ?? "—"}
          />
        </dl>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          Letzte Auszahlungen
        </h3>
        <DataTable
          columns={[
            {
              key: "date",
              header: "Datum",
              render: (payout) => formatDate(payout.paid_at),
            },
            {
              key: "client",
              header: "Kunde",
              render: (payout) => payout.client_name ?? "—",
            },
            {
              key: "amount",
              header: "Betrag",
              className: "text-right",
              render: (payout) => formatCents(payout.amount_cents),
            },
            {
              key: "status",
              header: "Status",
              render: (payout) => (payout.status === "paid" ? "Ausgezahlt" : payout.status),
            },
          ]}
          data={payouts.slice(0, 5)}
          rowKey={(payout) => payout.id}
          emptyState={
            <EmptyState
              icon={Banknote}
              title="Keine Auszahlungen"
              description="Noch keine Freelancer-Auszahlungen verbucht."
            />
          }
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          Letzte Rechnungen
        </h3>
        <DataTable
          columns={[
            {
              key: "number",
              header: "Rechnungsnummer",
              render: (invoice) => invoice.invoice_number,
            },
            {
              key: "client",
              header: "Kunde",
              render: (invoice) => invoice.client_name ?? "—",
            },
            {
              key: "amount",
              header: "Betrag",
              className: "text-right",
              render: (invoice) => formatCents(invoice.amount_cents),
            },
            {
              key: "date",
              header: "Datum",
              render: (invoice) => formatDate(`${invoice.invoice_date}T12:00:00`),
            },
          ]}
          data={invoices.slice(0, 5)}
          rowKey={(invoice) => invoice.id}
          emptyState={
            <EmptyState
              icon={FileText}
              title="Keine Rechnungen"
              description="Rechnungen werden automatisch bei Auszahlungen erzeugt."
            />
          }
        />
      </div>
    </div>
  );
}

function MasterDataTab({
  freelancer,
  billingProfile,
}: {
  freelancer: FreelancerDetailData["freelancer"];
  billingProfile: FreelancerDetailData["billingProfile"];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await updateFreelancerBillingProfile(freelancer.id, formData);
        setSuccess("Stammdaten gespeichert");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-500/20">
          {success}
        </div>
      )}

      <Section title="Stammdaten">
        <ReadOnlyField label="Name" value={freelancer.name} />
        <ReadOnlyField label="E-Mail" value={freelancer.email ?? "—"} />
        <ReadOnlyField
          label="Rolle"
          value={
            freelancer.role
              ? ROLE_LABELS[freelancer.role as UserRole] ?? freelancer.role
              : "Freelancer"
          }
        />
        <ReadOnlyField
          label="Status"
          value={freelancer.profile_status === "active" ? "Aktiv" : freelancer.profile_status ?? "—"}
        />
      </Section>

      <Section title="Bankdaten">
        <Field label="IBAN" name="iban" defaultValue={billingProfile.iban ?? ""} />
        <Field label="BIC" name="bic" defaultValue={billingProfile.bic ?? ""} />
        <Field label="Bank" name="bank_name" defaultValue={billingProfile.bank_name ?? ""} />
      </Section>

      <Section title="Rechnungsdaten">
        <Field
          label="Firmenname"
          name="business_name"
          defaultValue={billingProfile.business_name ?? ""}
        />
        <Field
          label="Steuernummer"
          name="tax_number"
          defaultValue={billingProfile.tax_number ?? ""}
        />
        <Field label="USt-ID" name="vat_id" defaultValue={billingProfile.vat_id ?? ""} />
        <Field
          label="Rechnungspräfix"
          name="invoice_prefix"
          defaultValue={billingProfile.invoice_prefix}
          placeholder="FR"
        />
      </Section>

      <Section title="Adresse">
        <Field label="Straße" name="street" defaultValue={billingProfile.street ?? ""} className="sm:col-span-2" />
        <Field label="Hausnummer" name="house_number" defaultValue={billingProfile.house_number ?? ""} />
        <Field label="PLZ" name="postal_code" defaultValue={billingProfile.postal_code ?? ""} />
        <Field label="Ort" name="city" defaultValue={billingProfile.city ?? ""} />
        <Field label="Land" name="country" defaultValue={billingProfile.country ?? "Deutschland"} />
        <Field label="Telefon" name="phone" defaultValue={billingProfile.phone ?? ""} />
      </Section>

      <Section title="Notizen">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-muted">Freitext</span>
          <textarea
            name="notes"
            rows={4}
            defaultValue={billingProfile.notes ?? ""}
            className="dashboard-input min-h-[100px] w-full"
          />
        </label>
      </Section>

      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="dashboard-btn-primary">
          {isPending ? "Speichern…" : "Speichern"}
        </button>
      </div>
    </form>
  );
}

function PayoutsTab({ payouts }: { payouts: FreelancerDetailData["payouts"] }) {
  return (
    <DataTable
      columns={[
        {
          key: "date",
          header: "Datum",
          render: (payout) => formatDate(payout.paid_at),
        },
        {
          key: "client",
          header: "Kunde",
          render: (payout) => payout.client_name ?? "—",
        },
        {
          key: "amount",
          header: "Betrag",
          className: "text-right",
          render: (payout) => formatCents(payout.amount_cents),
        },
        {
          key: "status",
          header: "Status",
          render: (payout) => (payout.status === "paid" ? "Ausgezahlt" : payout.status),
        },
      ]}
      data={payouts}
      rowKey={(payout) => payout.id}
      emptyState={
        <EmptyState
          icon={Banknote}
          title="Keine Auszahlungen"
          description="Auszahlungen erscheinen hier, sobald Freelancer-Projektanteile verbucht werden."
        />
      }
    />
  );
}

function InvoicesTab({ invoices }: { invoices: FreelancerDetailData["invoices"] }) {
  return (
    <DataTable
      columns={[
        {
          key: "number",
          header: "Rechnungsnummer",
          render: (invoice) => (
            <div>
              <div className="font-medium text-foreground">{invoice.invoice_number}</div>
              <div className="text-xs text-muted-soft">
                {formatDate(`${invoice.invoice_date}T12:00:00`)}
              </div>
            </div>
          ),
        },
        {
          key: "client",
          header: "Kunde",
          render: (invoice) => invoice.client_name ?? "—",
        },
        {
          key: "amount",
          header: "Betrag",
          className: "text-right",
          render: (invoice) => formatCents(invoice.amount_cents),
        },
        {
          key: "status",
          header: "Status",
          render: (invoice) =>
            invoice.status === "paid"
              ? "Bezahlt"
              : invoice.status === "issued"
                ? "Erstellt"
                : invoice.status,
        },
        {
          key: "actions",
          header: "",
          className: "text-right",
          render: (invoice) => (
            <button
              type="button"
              onClick={() =>
                window.open(
                  `/api/freelancer-profile-invoices/${invoice.id}/pdf`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="dashboard-link text-xs"
            >
              PDF
            </button>
          ),
        },
      ]}
      data={invoices}
      rowKey={(invoice) => invoice.id}
      emptyState={
        <EmptyState
          icon={Receipt}
          title="Keine Rechnungen"
          description="Rechnungen werden automatisch erzeugt, wenn eine Freelancer-Auszahlung verbucht wird."
        />
      }
    />
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="glass-card space-y-4 rounded-2xl p-5">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="dashboard-input w-full"
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-soft">{label}</div>
      <div className="mt-1 text-foreground">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-soft">{label}</dt>
      <dd className="mt-1 text-foreground">{value ?? "—"}</dd>
    </div>
  );
}
