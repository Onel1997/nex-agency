"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  Activity,
  Download,
  ExternalLink,
  FileText,
  MessageSquare,
  Pencil,
  Plus,
  Receipt,
  ScrollText,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createClientCommunication,
  createClientNote,
  createInvoice,
  createRetainerInvoice,
  createSetupInvoice,
  deleteClientCommunication,
  deleteClientFile,
  deleteClientNote,
  deleteInvoice,
  getClientFileSignedUrl,
  markInvoiceAsPaid,
  markInvoiceAsSent,
  updateClientNote,
  updateInvoice,
  uploadClientFile,
} from "@/app/dashboard/clients/[id]/actions";
import { updateClient } from "@/app/dashboard/clients/actions";
import type { ClientFormData } from "@/components/dashboard/ClientForm";
import { ClientModal } from "@/components/dashboard/ClientModal";
import { ClientRevenueModal } from "@/components/dashboard/ClientRevenueModal";
import { CommissionPayoutModal } from "@/components/dashboard/CommissionPayoutModal";
import { CommissionStatusBadge } from "@/components/dashboard/CommissionStatusBadge";
import { InvoiceStatusBadge } from "@/components/dashboard/InvoiceStatusBadge";
import { InvoiceTable } from "@/components/dashboard/InvoiceTable";
import { Toast } from "@/components/dashboard/Toast";
import type { Profile } from "@/lib/auth/types";
import { isManagement } from "@/lib/auth/permissions";
import {
  CLIENT_ACTIVITY_TYPE_LABELS,
  COMMUNICATION_TYPE_LABELS,
  COMMUNICATION_TYPES,
  BILLING_CYCLE_LABELS,
  CONTRACT_STATUS_LABELS,
  INVOICE_OPERATIONAL_STATUSES,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  type CommunicationType,
  type InvoiceStatus,
} from "@/lib/dashboard/constants";
import {
  centsToEuroInput,
  formatCents,
  formatDate,
  formatDateTime,
  formatFileSize,
  formatWebsite,
} from "@/lib/dashboard/format";
import { resolveRetainerAmountCents } from "@/lib/dashboard/billing-cycle";
import {
  formatRetainerPeriodStatus,
  getNextOpenRetainerPeriod,
  retainerPeriodStatusClassName,
} from "@/lib/dashboard/retainer";
import {
  canCreateSetupInvoice,
  filterInvoicesForClient,
  findSetupInvoice,
  getRetainerInvoicePreview,
  getSetupInvoicePreview,
  hasActiveContract,
  hasRetainerContract,
  hasSetupFee,
} from "@/lib/dashboard/contract-invoices";
import type {
  ClientActivity,
  ClientCommunication,
  ClientDetailRecord,
  ClientFile,
  ClientNote,
  ClientRevenueRecord,
  InvoiceRecord,
  TeamMember,
} from "@/lib/dashboard/types";

const TABS = [
  { id: "overview", label: "Übersicht", icon: FileText },
  { id: "notes", label: "Notizen", icon: ScrollText },
  { id: "activities", label: "Aktivitäten", icon: Activity },
  { id: "files", label: "Dateien", icon: Upload },
  { id: "communication", label: "Kommunikation", icon: MessageSquare },
  { id: "contracts", label: "Verträge", icon: Receipt },
  { id: "invoices", label: "Rechnungen", icon: Receipt },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface ClientDetailPageClientProps {
  client: ClientDetailRecord;
  notes: ClientNote[];
  activities: ClientActivity[];
  communications: ClientCommunication[];
  files: ClientFile[];
  revenue: ClientRevenueRecord | null;
  invoices: InvoiceRecord[];
  profile: Profile;
  canEdit: boolean;
  canAssign: boolean;
  teamMembers: TeamMember[];
}

export function ClientDetailPageClient({
  client,
  notes,
  activities,
  communications,
  files,
  revenue,
  invoices,
  profile,
  canEdit,
  canAssign,
  teamMembers,
}: ClientDetailPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId) || "overview";
  const [toast, setToast] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [payoutClient, setPayoutClient] = useState<ClientRevenueRecord | null>(null);
  const [, startTransition] = useTransition();
  const clientInvoices = filterInvoicesForClient(invoices, client.id);
  const activeContract = hasActiveContract(client);

  const setTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const refresh = () => startTransition(() => router.refresh());

  const handleError = (error: unknown) => {
    setToast(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
  };

  const handleSaveClient = async (data: ClientFormData) => {
    await updateClient(client.id, data);
    setEditOpen(false);
    refresh();
    setToast("Kunde aktualisiert");
  };

  return (
    <div className="space-y-6">
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
        <OverviewTab
          client={client}
          canEdit={canEdit}
          onEdit={() => setEditOpen(true)}
        />
      )}
      {activeTab === "notes" && (
        <NotesTab
          clientId={client.id}
          notes={notes}
          profileId={profile.id}
          isAdmin={isManagement(profile)}
          onError={handleError}
          onSuccess={(msg) => {
            setToast(msg);
            refresh();
          }}
        />
      )}
      {activeTab === "activities" && <ActivitiesTab activities={activities} />}
      {activeTab === "files" && (
        <FilesTab
          clientId={client.id}
          files={files}
          profileId={profile.id}
          isAdmin={isManagement(profile)}
          onError={handleError}
          onSuccess={(msg) => {
            setToast(msg);
            refresh();
          }}
        />
      )}
      {activeTab === "communication" && (
        <CommunicationTab
          clientId={client.id}
          communications={communications}
          profileId={profile.id}
          isAdmin={isManagement(profile)}
          onError={handleError}
          onSuccess={(msg) => {
            setToast(msg);
            refresh();
          }}
        />
      )}
      {activeTab === "contracts" && (
        <ContractsTab
          client={client}
          revenue={revenue}
          canEdit={canEdit}
          onEditContract={() => {
            if (!revenue) {
              setToast("Vertragsdaten konnten nicht geladen werden");
              return;
            }
            setContractModalOpen(true);
          }}
        />
      )}
      {activeTab === "invoices" && (
        <InvoicesTab
          client={client}
          revenue={revenue}
          companyName={client.company_name}
          invoices={clientInvoices}
          activeContract={activeContract}
          isAdmin={isManagement(profile)}
          onCreateSetupInvoice={async () => {
            try {
              const result = await createSetupInvoice(client.id);
              setToast(`Setup-Rechnung ${result.invoiceNumber} erstellt`);
              refresh();
            } catch (error) {
              handleError(error);
            }
          }}
          onCreateRetainerInvoice={async () => {
            try {
              const result = await createRetainerInvoice(client.id);
              setToast(`Retainer-Rechnung ${result.invoiceNumber} erstellt`);
              refresh();
            } catch (error) {
              handleError(error);
            }
          }}
          onError={handleError}
          onSuccess={(msg) => {
            setToast(msg);
            refresh();
          }}
        />
      )}

      {editOpen && (
        <ClientModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          client={client}
          onSave={handleSaveClient}
          canAssign={canAssign}
          teamMembers={teamMembers}
        />
      )}

      {contractModalOpen && revenue && (
        <ClientRevenueModal
          client={revenue}
          invoices={clientInvoices}
          open={contractModalOpen}
          payoutOpen={Boolean(payoutClient)}
          onClose={() => setContractModalOpen(false)}
          onRequestPayout={(selected) => setPayoutClient(selected)}
        />
      )}

      <CommissionPayoutModal
        client={payoutClient}
        open={Boolean(payoutClient)}
        onClose={() => setPayoutClient(null)}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function OverviewTab({
  client,
  canEdit,
  onEdit,
}: {
  client: ClientDetailRecord;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          Kundenübersicht
        </h2>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="dashboard-icon-btn inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm"
          >
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </button>
        )}
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoItem label="Firmenname" value={client.company_name} />
        <InfoItem label="Kundennummer" value={client.customer_number || "—"} />
        <InfoItem label="Ansprechpartner" value={client.contact_name || "—"} />
        <InfoItem label="Verantwortlicher" value={client.responsible_member_name || "—"} />
        <InfoItem
          label="Lead-Schätzung"
          value={formatCents(client.lead_estimated_value_cents)}
        />
        <InfoItem label="Setup-Gebühr" value={formatCents(client.setup_fee_cents)} />
        <InfoItem label="Status">
          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-200 ring-1 ring-emerald-500/25 ring-inset">
            Aktiv
          </span>
        </InfoItem>
        <InfoItem label="Kunde seit" value={formatDate(client.created_at)} />
        <InfoItem label="Umsatz" value={formatCents(client.total_revenue_cents)} />
        <InfoItem
          label="Offene Provisionen"
          value={formatCents(client.commission_outstanding_cents)}
        />
        <InfoItem label="E-Mail" value={client.email || "—"} />
        <InfoItem label="Telefon" value={client.phone || "—"} />
        <InfoItem label="Website">
          {client.website ? (
            <a
              href={
                client.website.startsWith("http")
                  ? client.website
                  : `https://${client.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="dashboard-link inline-flex items-center gap-1"
            >
              {formatWebsite(client.website)}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          ) : (
            "—"
          )}
        </InfoItem>
        <InfoItem label="Ursprungs-Lead">
          <Link
            href={`/dashboard/leads/${client.lead_id}`}
            className="dashboard-link"
          >
            Lead anzeigen
          </Link>
        </InfoItem>
      </dl>
    </div>
  );
}

function NotesTab({
  clientId,
  notes,
  profileId,
  isAdmin,
  onError,
  onSuccess,
}: {
  clientId: string;
  notes: ClientNote[];
  profileId: string;
  isAdmin: boolean;
  onError: (error: unknown) => void;
  onSuccess: (message: string) => void;
}) {
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [pending, setPending] = useState(false);

  const handleCreate = async () => {
    setPending(true);
    try {
      await createClientNote(clientId, content);
      setContent("");
      onSuccess("Notiz erstellt");
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  const handleUpdate = async (noteId: string) => {
    setPending(true);
    try {
      await updateClientNote(noteId, editContent);
      setEditingId(null);
      onSuccess("Notiz aktualisiert");
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm("Notiz wirklich löschen?")) return;
    setPending(true);
    try {
      await deleteClientNote(noteId);
      onSuccess("Notiz gelöscht");
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          Neue Notiz
        </h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="dashboard-input mt-3 w-full resize-y rounded-xl px-4 py-3 text-sm"
          placeholder="Notiz eingeben…"
        />
        <button
          type="button"
          disabled={pending || !content.trim()}
          onClick={handleCreate}
          className="dashboard-btn-primary mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Notiz speichern
        </button>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          Timeline
        </h2>
        {notes.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Noch keine Notizen vorhanden.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {notes.map((note) => {
              const canModify = note.author_id === profileId || isAdmin;
              const isEditing = editingId === note.id;

              return (
                <li
                  key={note.id}
                  className="rounded-xl border border-border/60 bg-white/[0.02] px-4 py-3"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="dashboard-input w-full resize-y rounded-xl px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleUpdate(note.id)}
                          className="dashboard-btn-primary rounded-lg px-3 py-1.5 text-sm"
                        >
                          Speichern
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="dashboard-btn-secondary rounded-lg px-3 py-1.5 text-sm"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {note.content}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-soft">
                          {note.author_name || "Unbekannt"} ·{" "}
                          {formatDateTime(note.created_at)}
                          {note.updated_at !== note.created_at && " (bearbeitet)"}
                        </p>
                        {canModify && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(note.id);
                                setEditContent(note.content);
                              }}
                              className="dashboard-icon-btn rounded-lg p-1.5"
                              aria-label="Bearbeiten"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(note.id)}
                              className="dashboard-icon-btn rounded-lg p-1.5 text-red-300 hover:text-red-200"
                              aria-label="Löschen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActivitiesTab({ activities }: { activities: ClientActivity[] }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
        Aktivitäten
      </h2>
      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Noch keine Aktivitäten vorhanden.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-white/[0.02] px-4 py-3"
            >
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400/80" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-violet-300/80">
                  {CLIENT_ACTIVITY_TYPE_LABELS[activity.activity_type]}
                </p>
                <p className="mt-1 text-sm text-foreground">{activity.description}</p>
                <p className="mt-1 text-xs text-muted-soft">
                  {activity.actor_name || "System"} · {formatDateTime(activity.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilesTab({
  clientId,
  files,
  profileId,
  isAdmin,
  onError,
  onSuccess,
}: {
  clientId: string;
  files: ClientFile[];
  profileId: string;
  isAdmin: boolean;
  onError: (error: unknown) => void;
  onSuccess: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    setPending(true);
    try {
      await uploadClientFile(clientId, formData);
      onSuccess("Datei hochgeladen");
      e.target.value = "";
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const url = await getClientFileSignedUrl(fileId);
      if (url) window.open(url, "_blank");
    } catch (error) {
      onError(error);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm("Datei wirklich löschen?")) return;
    setPending(true);
    try {
      await deleteClientFile(fileId);
      onSuccess("Datei gelöscht");
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          Datei hochladen
        </h2>
        <p className="mt-1 text-xs text-muted-soft">
          PDF, DOCX, XLSX oder Bilder (max. 50 MB)
        </p>
        <label className="dashboard-btn-primary mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm">
          <Upload className="h-4 w-4" />
          {pending ? "Wird hochgeladen…" : "Datei auswählen"}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
            disabled={pending}
            onChange={handleUpload}
          />
        </label>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        {files.length === 0 ? (
          <p className="p-6 text-sm text-muted">Noch keine Dateien vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="dashboard-table w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft">
                    Dateiname
                  </th>
                  <th className="hidden px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft md:table-cell">
                    Größe
                  </th>
                  <th className="hidden px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft md:table-cell">
                    Hochgeladen
                  </th>
                  <th className="px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-muted-soft">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {files.map((file) => {
                  const canDelete = file.uploaded_by === profileId || isAdmin;
                  return (
                    <tr key={file.id}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{file.file_name}</p>
                          <p className="text-xs text-muted-soft md:hidden">
                            {formatFileSize(file.file_size_bytes)} ·{" "}
                            {formatDate(file.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted md:table-cell">
                        {formatFileSize(file.file_size_bytes)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted md:table-cell">
                        {formatDateTime(file.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleDownload(file.id)}
                            className="dashboard-icon-btn rounded-lg p-2"
                            aria-label="Herunterladen"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(file.id)}
                              className="dashboard-icon-btn rounded-lg p-2 text-red-300 hover:text-red-200"
                              aria-label="Löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CommunicationTab({
  clientId,
  communications,
  profileId,
  isAdmin,
  onError,
  onSuccess,
}: {
  clientId: string;
  communications: ClientCommunication[];
  profileId: string;
  isAdmin: boolean;
  onError: (error: unknown) => void;
  onSuccess: (message: string) => void;
}) {
  const [type, setType] = useState<CommunicationType>("phone");
  const [summary, setSummary] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [pending, setPending] = useState(false);

  const handleCreate = async () => {
    setPending(true);
    try {
      await createClientCommunication(clientId, {
        type,
        summary,
        occurred_at: new Date(occurredAt).toISOString(),
      });
      setSummary("");
      onSuccess("Kommunikation gespeichert");
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eintrag wirklich löschen?")) return;
    setPending(true);
    try {
      await deleteClientCommunication(id);
      onSuccess("Eintrag gelöscht");
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          Neuer Eintrag
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-soft">
              Typ
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CommunicationType)}
              className="dashboard-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
            >
              {COMMUNICATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {COMMUNICATION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-soft">
              Datum
            </label>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="dashboard-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-soft">
            Zusammenfassung
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="dashboard-input mt-1 w-full resize-y rounded-xl px-3 py-2 text-sm"
            placeholder="Gesprächsinhalt, Ergebnis, nächste Schritte…"
          />
        </div>
        <button
          type="button"
          disabled={pending || !summary.trim()}
          onClick={handleCreate}
          className="dashboard-btn-primary mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Eintrag speichern
        </button>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          Verlauf
        </h2>
        {communications.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Noch keine Kommunikation erfasst.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {communications.map((entry) => {
              const canDelete = entry.author_id === profileId || isAdmin;
              return (
                <li
                  key={entry.id}
                  className="rounded-xl border border-border/60 bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-medium text-cyan-200 ring-1 ring-cyan-500/25 ring-inset">
                        {COMMUNICATION_TYPE_LABELS[entry.communication_type]}
                      </span>
                      <p className="mt-2 text-sm text-foreground">{entry.summary}</p>
                      <p className="mt-1 text-xs text-muted-soft">
                        {entry.author_name || "Unbekannt"} ·{" "}
                        {formatDateTime(entry.occurred_at)}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="dashboard-icon-btn shrink-0 rounded-lg p-1.5 text-red-300 hover:text-red-200"
                        aria-label="Löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ContractsTab({
  client,
  revenue,
  canEdit,
  onEditContract,
}: {
  client: ClientDetailRecord;
  revenue: ClientRevenueRecord | null;
  canEdit: boolean;
  onEditContract: () => void;
}) {
  const hasRetainer = resolveRetainerAmountCents(client) > 0;
  const contractStatus = revenue?.contract_status ?? client.contract_status ?? "draft";
  const paymentStatus =
    revenue && revenue.outstanding_retainer_cents > 0
      ? "Offene Zahlungen"
      : revenue && revenue.months_paid > 0
        ? "Aktuell"
        : "—";

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
          Vertragsübersicht
        </h2>
        {canEdit && (
          <button
            type="button"
            onClick={onEditContract}
            className="dashboard-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
          >
            <Pencil className="h-4 w-4" />
            Vertrag bearbeiten
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-muted">
        Setup-Gebühr, Retainer, Vertragsbeginn und Provision werden hier gepflegt.
        Rechnungen erstellen Sie im Tab Rechnungen.
      </p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoItem
          label="Setup-Gebühr"
          value={formatCents(revenue?.setup_fee_cents ?? client.setup_fee_cents)}
        />
        <InfoItem
          label="Monatlicher Retainer"
          value={formatCents(
            revenue?.monthly_revenue_cents ?? client.monthly_revenue_cents,
          )}
        />
        <InfoItem
          label="Vertragsbeginn"
          value={
            revenue?.contract_start_date || client.contract_start_date
              ? formatDate(
                  (revenue?.contract_start_date ?? client.contract_start_date)!,
                )
              : "—"
          }
        />
        <InfoItem label="Vertragsstatus">
          <span className="inline-flex rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-200 ring-1 ring-violet-500/25 ring-inset">
            {CONTRACT_STATUS_LABELS[contractStatus]}
          </span>
        </InfoItem>
        <InfoItem label="Zahlungsstatus" value={paymentStatus} />
        <InfoItem label="Gesamtumsatz" value={formatCents(client.total_revenue_cents)} />
        <InfoItem label="Provision">
          <CommissionStatusBadge status={client.commission_status} />
        </InfoItem>
        <InfoItem
          label="Offene Provision"
          value={formatCents(client.commission_outstanding_cents)}
        />
      </dl>

      {hasRetainer && (
        <div className="mt-6 border-t border-border pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-soft">
              Retainer-Abrechnung
            </h3>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                client.auto_invoice_enabled
                  ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25"
                  : "bg-amber-500/15 text-amber-200 ring-amber-500/25"
              }`}
            >
              {client.auto_invoice_enabled ? "Aktiv" : "Pausiert"}
            </span>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem
              label="Abrechnungsintervall"
              value={BILLING_CYCLE_LABELS[client.billing_cycle]}
            />
            <InfoItem
              label="Nächste Rechnung"
              value={
                client.next_invoice_date
                  ? formatDate(`${client.next_invoice_date}T12:00:00`)
                  : "—"
              }
            />
            <InfoItem
              label="Letzte Rechnung"
              value={
                client.last_invoice_date
                  ? formatDate(`${client.last_invoice_date}T12:00:00`)
                  : "—"
              }
            />
            <InfoItem
              label="Automatische Rechnungen"
              value={client.auto_invoice_enabled ? "Aktiv" : "Pausiert"}
            />
          </dl>
        </div>
      )}

      {revenue && revenue.retainer_periods.length > 0 && (
        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-soft">
            Retainer-Perioden
          </h3>
          <p className="mt-1 text-sm text-muted">
            Status wird aus Retainer-Rechnungen abgeleitet.
          </p>
          <ul className="mt-3 space-y-2">
            {revenue.retainer_periods.map((period) => (
              <li
                key={`${period.period_year}-${period.period_month}`}
                className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span>{period.label}</span>
                <span className={retainerPeriodStatusClassName(period.status)}>
                  {formatRetainerPeriodStatus(period.status)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InvoicesTab({
  client,
  revenue,
  companyName,
  invoices,
  activeContract,
  isAdmin,
  onCreateSetupInvoice,
  onCreateRetainerInvoice,
  onError,
  onSuccess,
}: {
  client: ClientDetailRecord;
  revenue: ClientRevenueRecord | null;
  companyName: string;
  invoices: InvoiceRecord[];
  activeContract: boolean;
  isAdmin: boolean;
  onCreateSetupInvoice: () => Promise<void>;
  onCreateRetainerInvoice: () => Promise<void>;
  onError: (error: unknown) => void;
  onSuccess: (message: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [pending, setPending] = useState(false);
  const setupPreview = getSetupInvoicePreview(client);
  const retainerPreview = getRetainerInvoicePreview(client);
  const setupInvoice = findSetupInvoice(invoices);
  const canCreateSetup = canCreateSetupInvoice(client, invoices);
  const canCreateRetainer = hasRetainerContract(client);
  const nextOpenRetainerPeriod = revenue
    ? getNextOpenRetainerPeriod(revenue.retainer_periods)
    : null;
  const canCreateRetainerInvoice = nextOpenRetainerPeriod?.status === "open";

  const resetForm = () => {
    setAmount("");
    setStatus("draft");
    setShowForm(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    setPending(true);
    try {
      await createInvoice(client.id, {
        amount,
        status,
      });
      resetForm();
      onSuccess("Rechnung erstellt");
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  const handleUpdate = async (invoiceId: string) => {
    setPending(true);
    try {
      await updateInvoice(invoiceId, { amount, status });
      resetForm();
      onSuccess("Rechnung aktualisiert");
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (!window.confirm("Rechnung wirklich löschen?")) return;
    setPending(true);
    try {
      await deleteInvoice(invoiceId);
      onSuccess("Rechnung gelöscht");
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  const startEdit = (invoice: InvoiceRecord) => {
    setEditingId(invoice.id);
    setAmount(centsToEuroInput(invoice.subtotal_cents));
    setStatus(invoice.status);
    setShowForm(true);
  };

  const handleDownloadPdf = (invoiceId: string) => {
    window.open(
      `/api/invoices/${invoiceId}/pdf?clientId=${client.id}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleMarkSent = async (invoiceId: string) => {
    setPending(true);
    try {
      await markInvoiceAsSent(invoiceId);
      onSuccess("Rechnung als gesendet markiert");
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    setPending(true);
    try {
      await markInvoiceAsPaid(invoiceId);
      onSuccess("Rechnung als bezahlt markiert");
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  const handleCreateFromContract = async (type: "setup" | "retainer") => {
    setPending(true);
    try {
      if (type === "setup") {
        await onCreateSetupInvoice();
      } else {
        await onCreateRetainerInvoice();
      }
    } catch (error) {
      onError(error);
    } finally {
      setPending(false);
    }
  };

  const editingInvoice = editingId
    ? invoices.find((invoice) => invoice.id === editingId)
    : null;

  return (
    <div className="space-y-4">
      {activeContract ? (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
            Rechnungen aus Vertrag
          </h2>
          <p className="mt-2 text-sm text-muted">
            Erstellen Sie Setup- und Retainer-Rechnungen auf Basis der Vertragsdaten.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {hasSetupFee(client) && setupPreview && (
              <div className="rounded-xl border border-border/60 bg-white/[0.02] p-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-soft">
                  Setup-Rechnung
                </h3>
                <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                  <InfoItem label="Netto" value={formatCents(setupPreview.subtotalCents)} />
                  <InfoItem label="MwSt." value={formatCents(setupPreview.taxAmountCents)} />
                  <InfoItem
                    label="Gesamt"
                    value={formatCents(setupPreview.totalAmountCents)}
                  />
                </dl>
                {canCreateSetup ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleCreateFromContract("setup")}
                    className="dashboard-btn-primary mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
                  >
                    <Receipt className="h-4 w-4" />
                    {pending ? "Wird erstellt…" : "Setup-Rechnung erstellen"}
                  </button>
                ) : setupInvoice ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted">{setupInvoice.invoice_number}</span>
                    <InvoiceStatusBadge status={setupInvoice.status as InvoiceStatus} />
                  </div>
                ) : null}
              </div>
            )}

            {canCreateRetainer && retainerPreview && (
              <div className="rounded-xl border border-border/60 bg-white/[0.02] p-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-soft">
                  Retainer-Rechnung
                </h3>
                <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                  <InfoItem
                    label="Netto / Monat"
                    value={formatCents(retainerPreview.subtotalCents)}
                  />
                  <InfoItem label="MwSt." value={formatCents(retainerPreview.taxAmountCents)} />
                  <InfoItem
                    label="Gesamt"
                    value={formatCents(retainerPreview.totalAmountCents)}
                  />
                </dl>
                {nextOpenRetainerPeriod && (
                  <p className="mt-2 text-xs text-muted-soft">
                    Nächste offene Periode: {nextOpenRetainerPeriod.label}
                    {" · "}
                    {formatRetainerPeriodStatus(nextOpenRetainerPeriod.status)}
                  </p>
                )}
                <button
                  type="button"
                  disabled={pending || !canCreateRetainerInvoice}
                  onClick={() => handleCreateFromContract("retainer")}
                  className="dashboard-btn-primary mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
                >
                  <Receipt className="h-4 w-4" />
                  {pending ? "Wird erstellt…" : "Retainer-Rechnung erzeugen"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="dashboard-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Neue Rechnung
          </button>
        </div>
      )}

      {showForm && (!activeContract || editingId) && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
            {editingId ? "Rechnung bearbeiten" : "Neue Rechnung"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-soft">
                Nettobetrag (EUR)
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="dashboard-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-soft">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className="dashboard-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              >
                {INVOICE_OPERATIONAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {INVOICE_STATUS_LABELS[s]}
                  </option>
                ))}
                {editingInvoice?.status === "cancelled" && (
                  <option value="cancelled">{INVOICE_STATUS_LABELS.cancelled}</option>
                )}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                editingId ? handleUpdate(editingId) : handleCreate()
              }
              className="dashboard-btn-primary rounded-xl px-4 py-2 text-sm"
            >
              {editingId ? "Speichern" : "Erstellen"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="dashboard-btn-secondary rounded-xl px-4 py-2 text-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden rounded-2xl">
        <InvoiceTable
          invoices={invoices}
          variant="full"
          companyName={companyName}
          showActions
          isAdmin={isAdmin}
          pending={pending}
          onDownload={handleDownloadPdf}
          onMarkSent={handleMarkSent}
          onMarkPaid={handleMarkPaid}
          onEdit={startEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-soft">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children ?? value}</dd>
    </div>
  );
}
