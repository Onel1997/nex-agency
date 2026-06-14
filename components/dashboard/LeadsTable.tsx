"use client";

import Link from "next/link";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import {
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/dashboard/constants";
import { formatCents, formatDate, formatWebsite } from "@/lib/dashboard/format";
import {
  canChangeLeadStatus,
  getSelectableLeadStatuses,
} from "@/lib/dashboard/lead-pipeline";
import { resolveLeadWorkflowStatus } from "@/lib/dashboard/workflow-status";
import type { Lead } from "@/lib/dashboard/types";
import { DataTable } from "./DataTable";
import { LeadWorkflowBadge } from "./WorkflowStatusBadge";
import { LeadClaimAction } from "./LeadClaimAction";
import { LeadConversionAction } from "./LeadConversionAction";
import { LeadMarkWonAction } from "./LeadMarkWonAction";
import type { Profile } from "@/lib/auth/types";
import {
  canClaimLead,
  canConvertLeadForLead,
  canMarkLeadWonForLead,
} from "@/lib/dashboard/lead-ownership";

interface LeadsTableProps {
  leads: Lead[];
  showOwnership?: boolean;
  profile: Profile;
  canMarkLeadWon?: boolean;
  canConvertLead?: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onMarkWon: (leadId: string) => Promise<void>;
  onConvert: (leadId: string) => Promise<void>;
  onClaim: (leadId: string) => Promise<void>;
}

export function LeadsTable({
  leads,
  showOwnership = false,
  profile,
  canMarkLeadWon = false,
  canConvertLead = false,
  onEdit,
  onDelete,
  onStatusChange,
  onMarkWon,
  onConvert,
  onClaim,
}: LeadsTableProps) {
  return (
    <DataTable
      data={leads}
      rowKey={(lead) => lead.id}
      columns={[
        {
          key: "company",
          header: "Firma",
          render: (lead) => (
            <Link
              href={`/dashboard/leads/${lead.id}`}
              className="font-medium text-foreground transition-colors hover:text-violet-300"
            >
              {lead.company_name}
            </Link>
          ),
        },
        {
          key: "contact",
          header: "Ansprechpartner",
          hideOnMobile: true,
          render: (lead) => lead.contact_name || "—",
        },
        {
          key: "value",
          header: "Geschätzter Wert",
          hideOnMobile: true,
          render: (lead) => formatCents(lead.estimated_value_cents),
        },
        ...(showOwnership
          ? [
              {
                key: "owner",
                header: "Betreuer",
                hideOnMobile: true,
                render: (lead: Lead) => lead.owner_name || "—",
              },
              {
                key: "creator",
                header: "Erstellt von",
                hideOnMobile: true,
                render: (lead: Lead) => lead.creator_name || "—",
              },
            ]
          : []),
        {
          key: "phone",
          header: "Telefon",
          hideOnMobile: true,
          render: (lead) =>
            lead.phone ? (
              <a href={`tel:${lead.phone}`} className="dashboard-link">
                {lead.phone}
              </a>
            ) : (
              "—"
            ),
        },
        {
          key: "website",
          header: "Website",
          hideOnMobile: true,
          render: (lead) =>
            lead.website ? (
              <a
                href={
                  lead.website.startsWith("http")
                    ? lead.website
                    : `https://${lead.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="dashboard-link inline-flex items-center gap-1"
              >
                {formatWebsite(lead.website)}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            ) : (
              "—"
            ),
        },
        {
          key: "workflow",
          header: "Workflow",
          hideOnMobile: true,
          render: (lead) => {
            const workflow = resolveLeadWorkflowStatus(lead);
            return workflow ? (
              <LeadWorkflowBadge stage={workflow.stage} urgency={workflow.urgency} />
            ) : (
              "—"
            );
          },
        },
        {
          key: "status",
          header: "Status",
          render: (lead) => {
            const selectableStatuses = getSelectableLeadStatuses(profile, lead);
            const statusLocked =
              !canChangeLeadStatus(profile, lead) || lead.status === "won";

            return (
            <div className="flex min-w-[9rem] flex-col gap-2">
              <select
                value={lead.status}
                onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
                className="dashboard-select-sm"
                aria-label={`Status für ${lead.company_name}`}
                disabled={statusLocked}
              >
                {selectableStatuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                    disabled={status === "won" && !canMarkLeadWon}
                  >
                    {LEAD_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <LeadClaimAction
                lead={lead}
                canClaim={canClaimLead(profile, lead)}
                onClaim={onClaim}
              />
              <LeadMarkWonAction
                lead={lead}
                canMarkWon={
                  canMarkLeadWon && canMarkLeadWonForLead(profile, lead)
                }
                onMarkWon={onMarkWon}
              />
              {canConvertLead && canConvertLeadForLead(profile, lead) ? (
                <LeadConversionAction lead={lead} onConvert={onConvert} />
              ) : null}
            </div>
            );
          },
        },
        {
          key: "acquired",
          header: "Akquiriert von",
          hideOnMobile: true,
          render: (lead) => lead.acquired_by || "—",
        },
        {
          key: "created",
          header: "Erstellt am",
          hideOnMobile: true,
          render: (lead) => formatDate(lead.created_at),
        },
        {
          key: "actions",
          header: "Aktionen",
          className: "w-[100px]",
          render: (lead) => (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(lead)}
                className="dashboard-icon-btn rounded-lg p-2 text-muted hover:text-foreground"
                aria-label="Bearbeiten"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(lead)}
                className="dashboard-icon-btn rounded-lg p-2 text-muted hover:text-red-300"
                aria-label="Löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ),
        },
      ]}
    />
  );
}
