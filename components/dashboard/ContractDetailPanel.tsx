"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Download, ExternalLink, FileText, Pencil, Trash2, Upload } from "lucide-react";
import {
  deleteContract,
  deleteContractDocument,
  getContractDocumentDownloadUrl,
  regenerateContractPdf,
  updateContract,
  uploadContractDocument,
} from "@/app/dashboard/contracts/actions";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { ContractStatusBadge } from "@/components/dashboard/ContractStatusBadge";
import { ContractStatusTimeline } from "@/components/dashboard/ContractStatusTimeline";
import { CreateContractModal } from "@/components/dashboard/CreateContractModal";
import { Modal } from "@/components/dashboard/Modal";
import {
  CONTRACT_CATEGORY_LABELS,
  CONTRACT_TYPE_LABELS,
} from "@/lib/dashboard/contract-constants";
import {
  CONTRACT_LIFECYCLE_PLACEHOLDER_ACTIONS,
  CONTRACT_LIFECYCLE_SHORT_LABELS,
  getContractDeleteDialogTitle,
  getContractDetailUiPermissions,
} from "@/lib/dashboard/contract-lifecycle";
import { formatCents, formatDate, formatDateTime } from "@/lib/dashboard/format";
import type { ContractWithDetails, TeamMember } from "@/lib/dashboard/types";

interface ContractDetailPanelProps {
  contract: ContractWithDetails | null;
  members: TeamMember[];
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-soft">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

const LIFECYCLE_PLACEHOLDER_STYLES: Record<
  (typeof CONTRACT_LIFECYCLE_PLACEHOLDER_ACTIONS)[number],
  string
> = {
  send: "dashboard-btn-primary",
  sign: "dashboard-btn-primary",
  activate: "dashboard-btn-primary",
  terminate:
    "inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 ring-1 ring-red-500/25",
  archive: "dashboard-btn-secondary",
};

export function ContractDetailPanel({
  contract,
  members,
  open,
  onClose,
  onRefresh,
}: ContractDetailPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setError(null);
      setEditOpen(false);
      setDeleteOpen(false);
    }
  }, [open, contract?.id]);

  if (!contract) return null;

  const permissions = getContractDetailUiPermissions(contract.status);
  const isArchived = contract.status === "archived";

  const handleDeleteConfirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteContract(contract.id);
        setDeleteOpen(false);
        onClose();
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
      }
    });
  };

  const handleEdit = async (formData: FormData) => {
    await updateContract(contract.id, formData);
    setEditOpen(false);
    onRefresh();
  };

  const handleUpload = (file: File) => {
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      try {
        await uploadContractDocument(contract.id, formData);
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
      }
    });
  };

  const handleDeleteDocument = (documentId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteContractDocument(documentId);
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
      }
    });
  };

  const handleDownloadDocument = (documentId: string) => {
    startTransition(async () => {
      try {
        const url = await getContractDocumentDownloadUrl(documentId);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download fehlgeschlagen");
      }
    });
  };

  const handleRegeneratePdf = () => {
    setError(null);
    startTransition(async () => {
      try {
        await regenerateContractPdf(contract.id);
        onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "PDF konnte nicht erzeugt werden");
      }
    });
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={contract.contract_number} size="lg">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-200 ring-1 ring-violet-500/25">
              {CONTRACT_CATEGORY_LABELS[contract.contract_category]}
            </span>
            <ContractStatusBadge status={contract.status} />
          </div>

          <ContractStatusTimeline
            status={contract.status}
            timestamps={{
              sent_at: contract.sent_at,
              signed_at: contract.signed_at,
              activated_at: contract.activated_at,
              terminated_at: contract.terminated_at,
              archived_at: contract.archived_at,
            }}
          />

          <div className="flex flex-wrap gap-2 border-b border-border pb-4">
            {CONTRACT_LIFECYCLE_PLACEHOLDER_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                disabled
                aria-disabled="true"
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm opacity-60 ${LIFECYCLE_PLACEHOLDER_STYLES[action]}`}
              >
                {CONTRACT_LIFECYCLE_SHORT_LABELS[action]}
              </button>
            ))}
          </div>

          {(permissions.canEdit || permissions.canDelete) && (
            <div className="flex flex-wrap gap-2 border-b border-border pb-4">
              {permissions.canEdit && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setEditOpen(true)}
                  className="dashboard-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <Pencil className="h-4 w-4" />
                  Bearbeiten
                </button>
              )}

              {permissions.canDelete && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 ring-1 ring-red-500/25 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </button>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="NexAgency">
              {contract.signed_by_agency && contract.agency_signed_at
                ? `Digital bestätigt am ${formatDate(contract.agency_signed_at)}`
                : "Noch nicht unterschrieben"}
            </DetailRow>
            <DetailRow label="Vertragspartner">
              {contract.signed_by_partner && contract.partner_signed_at
                ? `Digital bestätigt am ${formatDate(contract.partner_signed_at)}`
                : "Noch nicht unterschrieben"}
            </DetailRow>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="Person">
              <Link
                href={`/dashboard/team/${contract.profile_id}?tab=contracts`}
                className="dashboard-link inline-flex items-center gap-1"
              >
                {contract.profile_name}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </DetailRow>
            <DetailRow label="Vertragstyp">
              {CONTRACT_TYPE_LABELS[contract.contract_type]}
            </DetailRow>
            <DetailRow label="Beginn">
              {contract.start_date ? formatDate(contract.start_date) : "—"}
            </DetailRow>
            <DetailRow label="Ende">
              {contract.end_date ? formatDate(contract.end_date) : "—"}
            </DetailRow>
          </div>

          {contract.contract_category === "employee" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <DetailRow label="Monatsgehalt">
                  {contract.monthly_salary_cents != null
                    ? formatCents(contract.monthly_salary_cents)
                    : "—"}
                </DetailRow>
                <DetailRow label="Arbeitszeit">
                  {contract.working_hours_per_week != null
                    ? `${contract.working_hours_per_week} Std./Woche`
                    : "—"}
                </DetailRow>
                <DetailRow label="Urlaubstage">
                  {contract.vacation_days_per_year != null
                    ? `${contract.vacation_days_per_year} Tage`
                    : "—"}
                </DetailRow>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow label="IBAN">{contract.profile_iban ?? "—"}</DetailRow>
                <DetailRow label="BIC">{contract.profile_bic ?? "—"}</DetailRow>
                <DetailRow label="Bank">{contract.profile_bank_name ?? "—"}</DetailRow>
                <DetailRow label="Steuer-ID">{contract.profile_tax_id ?? "—"}</DetailRow>
                <DetailRow label="Sozialversicherung">
                  {contract.profile_social_security_number ?? "—"}
                </DetailRow>
                <DetailRow label="Krankenkasse">
                  {contract.profile_health_insurance ?? "—"}
                </DetailRow>
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow label="Setup-Provision">
                {contract.setup_commission_rate != null
                  ? `${contract.setup_commission_rate} %`
                  : contract.commission_rate != null
                    ? `${contract.commission_rate} %`
                    : "—"}
              </DetailRow>
              <DetailRow label="Retainer-Provision">
                {contract.retainer_commission_rate != null
                  ? `${contract.retainer_commission_rate} %`
                  : "—"}
              </DetailRow>
              <DetailRow label="Retainer-Monate">
                {contract.retainer_commission_months ?? "—"}
              </DetailRow>
              <DetailRow label="Firma">{contract.profile_business_name ?? "—"}</DetailRow>
              <DetailRow label="IBAN">{contract.profile_iban ?? "—"}</DetailRow>
              <DetailRow label="Steuernummer">{contract.profile_tax_number ?? "—"}</DetailRow>
              <DetailRow label="USt-ID">{contract.profile_vat_id ?? "—"}</DetailRow>
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <a
              href={`/api/contracts/${contract.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="dashboard-btn-secondary inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PDF herunterladen
            </a>
            {!isArchived && (
              <button
                type="button"
                disabled={pending}
                onClick={handleRegeneratePdf}
                className="dashboard-btn-secondary inline-flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                PDF neu generieren
              </button>
            )}
          </div>

          {!isArchived && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-foreground">Dokumente</h3>
                <label className="dashboard-btn-secondary inline-flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs">
                  <Upload className="h-3.5 w-3.5" />
                  Hochladen
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    disabled={pending}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleUpload(file);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>

              {contract.documents.length === 0 ? (
                <p className="text-sm text-muted">Noch keine Dokumente hochgeladen.</p>
              ) : (
                <ul className="space-y-2">
                  {contract.documents.map((document) => (
                    <li
                      key={document.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10"
                    >
                      <div>
                        <p className="text-sm font-medium">{document.file_name}</p>
                        <p className="text-xs text-muted-soft">
                          {formatDateTime(document.created_at)}
                          {document.uploader_name ? ` · ${document.uploader_name}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleDownloadDocument(document.id)}
                          className="dashboard-link text-xs"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleDeleteDocument(document.id)}
                          className="inline-flex items-center gap-1 text-xs text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>

      <CreateContractModal
        open={editOpen}
        members={members}
        editContract={contract}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        pending={pending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={getContractDeleteDialogTitle(contract.status)}
        confirmLabel="Löschen"
        variant="danger"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
