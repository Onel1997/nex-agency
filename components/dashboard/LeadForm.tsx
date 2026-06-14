"use client";

import {
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/dashboard/constants";
import type { Lead, TeamMember } from "@/lib/dashboard/types";
import { centsToEuroInput } from "@/lib/dashboard/format";
import { ASSIGNMENT_FIELD_LABEL } from "@/lib/dashboard/assignments";

export interface LeadFormData {
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  website: string;
  status: LeadStatus;
  acquired_by: string;
  owner_id: string;
  estimated_value: string;
  notes: string;
}

export const emptyLeadForm: LeadFormData = {
  company_name: "",
  contact_name: "",
  phone: "",
  email: "",
  website: "",
  status: "new",
  acquired_by: "",
  owner_id: "",
  estimated_value: "",
  notes: "",
};

export function leadToFormData(lead: Lead): LeadFormData {
  return {
    company_name: lead.company_name,
    contact_name: lead.contact_name ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    website: lead.website ?? "",
    status: lead.status,
    acquired_by: lead.acquired_by ?? "",
    owner_id: lead.owner_id ?? "",
    estimated_value: centsToEuroInput(lead.estimated_value_cents),
    notes: lead.notes ?? "",
  };
}

function memberLabel(member: TeamMember) {
  return member.full_name?.trim() || member.email.split("@")[0];
}

const BETREUER_ROLES = new Set(["super_admin", "admin", "sales_manager"]);

function isBetreuerMember(member: TeamMember) {
  return BETREUER_ROLES.has(member.role);
}

interface LeadFormProps {
  formId: string;
  data: LeadFormData;
  onChange: (data: LeadFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  canAssign?: boolean;
  teamMembers?: TeamMember[];
  defaultOwnerId?: string;
  creatorName?: string | null;
  mode?: "create" | "edit";
  allowedStatuses?: LeadStatus[];
  statusDisabled?: boolean;
}

export function LeadForm({
  formId,
  data,
  onChange,
  onSubmit,
  submitLabel,
  isSubmitting,
  canAssign = false,
  teamMembers = [],
  defaultOwnerId,
  creatorName,
  mode = "create",
  allowedStatuses,
  statusDisabled = false,
}: LeadFormProps) {
  const betreuerMembers = teamMembers.filter(isBetreuerMember);
  const defaultBetreuerId =
    defaultOwnerId && betreuerMembers.some((member) => member.id === defaultOwnerId)
      ? defaultOwnerId
      : "";
  const ownerValue = data.owner_id || defaultBetreuerId || "";
  const ownerOptions =
    ownerValue && !betreuerMembers.some((member) => member.id === ownerValue)
      ? [
          ...betreuerMembers,
          ...teamMembers.filter((member) => member.id === ownerValue),
        ]
      : betreuerMembers;
  const hasLegacyAcquiredBy =
    Boolean(data.acquired_by) &&
    !teamMembers.some((member) => memberLabel(member) === data.acquired_by);

  const statusOptions =
    allowedStatuses ?? (Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]);

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Firmenname" required>
          <input
            required
            value={data.company_name}
            onChange={(e) => onChange({ ...data, company_name: e.target.value })}
            className="dashboard-input"
            placeholder="Muster GmbH"
          />
        </Field>
        <Field label="Ansprechpartner">
          <input
            value={data.contact_name}
            onChange={(e) => onChange({ ...data, contact_name: e.target.value })}
            className="dashboard-input"
            placeholder="Max Mustermann"
          />
        </Field>
        <Field label="Telefon">
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
            className="dashboard-input"
            placeholder="+49 ..."
          />
        </Field>
        <Field label="E-Mail">
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            className="dashboard-input"
            placeholder="kontakt@firma.de"
          />
        </Field>
        <Field label="Website">
          <input
            type="url"
            value={data.website}
            onChange={(e) => onChange({ ...data, website: e.target.value })}
            className="dashboard-input"
            placeholder="https://firma.de"
          />
        </Field>
        <Field label="Status">
          <select
            value={data.status}
            onChange={(e) =>
              onChange({ ...data, status: e.target.value as LeadStatus })
            }
            className="dashboard-input"
            disabled={statusDisabled}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {LEAD_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Geschätzter Wert (EUR)">
          <input
            inputMode="decimal"
            value={data.estimated_value}
            onChange={(e) => onChange({ ...data, estimated_value: e.target.value })}
            className="dashboard-input"
            placeholder="5.000"
          />
        </Field>
        {canAssign && (
          <Field label={ASSIGNMENT_FIELD_LABEL} className="sm:col-span-2">
            <select
              value={ownerValue}
              onChange={(e) => onChange({ ...data, owner_id: e.target.value })}
              className="dashboard-input"
              required
            >
              <option value="">— Mitarbeiter wählen —</option>
              {ownerOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {memberLabel(member)}
                </option>
              ))}
            </select>
          </Field>
        )}
        {mode === "edit" && creatorName && (
          <Field label="Erstellt von" className="sm:col-span-2">
            <input
              value={creatorName}
              readOnly
              className="dashboard-input cursor-not-allowed opacity-70"
            />
          </Field>
        )}
        <Field label="Akquiriert von" className="sm:col-span-2">
          <select
            value={data.acquired_by}
            onChange={(e) => onChange({ ...data, acquired_by: e.target.value })}
            className="dashboard-input"
          >
            <option value="">— Teammitglied wählen —</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={memberLabel(member)}>
                {memberLabel(member)}
              </option>
            ))}
            {hasLegacyAcquiredBy && (
              <option value={data.acquired_by}>{data.acquired_by}</option>
            )}
          </select>
        </Field>
        <Field label="Notizen" className="sm:col-span-2">
          <textarea
            value={data.notes}
            onChange={(e) => onChange({ ...data, notes: e.target.value })}
            className="dashboard-input min-h-[100px] resize-y"
            placeholder="Interne Notizen..."
            rows={4}
          />
        </Field>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="dashboard-btn-primary"
        >
          {isSubmitting ? "Speichern..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
        {required && <span className="text-violet-400"> *</span>}
      </span>
      {children}
    </label>
  );
}
