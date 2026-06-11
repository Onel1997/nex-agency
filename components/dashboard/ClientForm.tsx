"use client";

import type { ClientRecord, TeamMember } from "@/lib/dashboard/types";
import { centsToEuroInput } from "@/lib/dashboard/format";
import { ASSIGNMENT_FIELD_LABEL } from "@/lib/dashboard/assignments";

export interface ClientFormData {
  responsible_member_id: string;
  contract_value: string;
  monthly_retainer: string;
  one_time_project_value: string;
}

export function clientToFormData(client: ClientRecord): ClientFormData {
  return {
    responsible_member_id: client.responsible_member_id ?? "",
    contract_value: centsToEuroInput(client.contract_value_cents),
    monthly_retainer: centsToEuroInput(client.monthly_retainer_cents),
    one_time_project_value: centsToEuroInput(client.one_time_project_value_cents),
  };
}

function memberLabel(member: TeamMember) {
  return member.full_name?.trim() || member.email.split("@")[0];
}

interface ClientFormProps {
  formId: string;
  data: ClientFormData;
  onChange: (data: ClientFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  canAssign?: boolean;
  teamMembers?: TeamMember[];
  companyName: string;
}

export function ClientForm({
  formId,
  data,
  onChange,
  onSubmit,
  submitLabel,
  isSubmitting,
  canAssign = false,
  teamMembers = [],
  companyName,
}: ClientFormProps) {
  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted">
        Kunde: <span className="font-medium text-foreground">{companyName}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {canAssign && (
          <Field label={ASSIGNMENT_FIELD_LABEL} className="sm:col-span-2">
            <select
              value={data.responsible_member_id}
              onChange={(e) =>
                onChange({ ...data, responsible_member_id: e.target.value })
              }
              className="dashboard-input"
              required
            >
              <option value="">— Teammitglied wählen —</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {memberLabel(member)}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Vertragswert (EUR)">
          <input
            inputMode="decimal"
            value={data.contract_value}
            onChange={(e) => onChange({ ...data, contract_value: e.target.value })}
            className="dashboard-input"
            placeholder="10.000"
          />
        </Field>
        <Field label="Monatlicher Retainer (EUR)">
          <input
            inputMode="decimal"
            value={data.monthly_retainer}
            onChange={(e) => onChange({ ...data, monthly_retainer: e.target.value })}
            className="dashboard-input"
            placeholder="2.000"
          />
        </Field>
        <Field label="Einmaliges Projektvolumen (EUR)" className="sm:col-span-2">
          <input
            inputMode="decimal"
            value={data.one_time_project_value}
            onChange={(e) =>
              onChange({ ...data, one_time_project_value: e.target.value })
            }
            className="dashboard-input"
            placeholder="5.000"
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
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
