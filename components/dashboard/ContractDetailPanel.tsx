"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Download, ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import {
  deleteContractDocument,
  getContractDocumentDownloadUrl,
  regenerateContractPdf,
  uploadContractDocument,
} from "@/app/dashboard/contracts/actions";
import { Modal } from "@/components/dashboard/Modal";
import {
  CONTRACT_CATEGORY_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
} from "@/lib/dashboard/contract-constants";
import { formatCents, formatDate, formatDateTime } from "@/lib/dashboard/format";
import type { ContractWithDetails } from "@/lib/dashboard/types";

interface ContractDetailPanelProps {
  contract: ContractWithDetails | null;
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

export function ContractDetailPanel({
  contract,
  open,
  onClose,
  onRefresh,
}: ContractDetailPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setError(null);
  }, [open, contract?.id]);

  if (!contract) return null;

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
    <Modal open={open} onClose={onClose} title={contract.contract_number} size="lg">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-200 ring-1 ring-violet-500/25">
            {CONTRACT_CATEGORY_LABELS[contract.contract_category]}
          </span>
          <span className="text-sm text-muted">
            {CONTRACT_STATUS_LABELS[contract.status]}
          </span>
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
          <button
            type="button"
            disabled={pending}
            onClick={handleRegeneratePdf}
            className="dashboard-btn-secondary inline-flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            PDF neu generieren
          </button>
        </div>

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
      </div>
    </Modal>
  );
}
