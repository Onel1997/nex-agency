"use client";

import Link from "next/link";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/dashboard/constants";
import { formatDate, formatWebsite } from "@/lib/dashboard/format";
import type { Lead } from "@/lib/dashboard/types";
import { DataTable } from "./DataTable";

interface LeadsTableProps {
  leads: Lead[];
  showAssignee?: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
}

export function LeadsTable({
  leads,
  showAssignee = false,
  onEdit,
  onDelete,
  onStatusChange,
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
                href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
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
          key: "status",
          header: "Status",
          render: (lead) => (
            <select
              value={lead.status}
              onChange={(e) =>
                onStatusChange(lead.id, e.target.value as LeadStatus)
              }
              className="dashboard-select-sm"
              aria-label={`Status für ${lead.company_name}`}
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          ),
        },
        {
          key: "acquired",
          header: "Akquiriert von",
          hideOnMobile: true,
          render: (lead) => lead.acquired_by || "—",
        },
        ...(showAssignee
          ? [
              {
                key: "assignee",
                header: "Zugewiesen an",
                hideOnMobile: true,
                render: (lead: Lead) => lead.assignee_name || "—",
              },
            ]
          : []),
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
                onClick={() => onDelete(lead.id)}
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
