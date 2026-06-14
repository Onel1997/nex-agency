"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import {
  CONTRACT_STATUSES,
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
  type ContractStatus,
  type ContractType,
} from "@/lib/dashboard/contract-constants";
import {
  defaultContractTitle,
  defaultContractTypeForProfile,
} from "@/lib/dashboard/contract-form";
import type { TeamMember } from "@/lib/dashboard/types";
import { getAgencyRoleLabel, getEmploymentTypeLabel } from "@/lib/auth/roles";

interface CreateContractModalProps {
  open: boolean;
  members: TeamMember[];
  preselectedProfileId?: string | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  pending?: boolean;
}

export function CreateContractModal({
  open,
  members,
  preselectedProfileId,
  onClose,
  onSubmit,
  pending = false,
}: CreateContractModalProps) {
  const [profileId, setProfileId] = useState(preselectedProfileId ?? members[0]?.id ?? "");
  const [contractType, setContractType] = useState<ContractType>("employee");
  const [status, setStatus] = useState<ContractStatus>("draft");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === profileId) ?? null,
    [members, profileId],
  );

  useEffect(() => {
    if (!open) return;
    const nextProfileId = preselectedProfileId ?? members[0]?.id ?? "";
    setProfileId(nextProfileId);
    setStatus("draft");
    setStartDate("");
    setEndDate("");
    setMonthlySalary("");
    setCommissionRate("");
    setNotes("");
    setError(null);
  }, [open, members, preselectedProfileId]);

  useEffect(() => {
    if (!selectedMember) return;
    setContractType(defaultContractTypeForProfile(selectedMember));
    setTitle(defaultContractTitle(selectedMember));
    setCommissionRate(
      String(
        selectedMember.closer_commission_rate ||
          selectedMember.setter_commission_rate ||
          "",
      ),
    );
  }, [selectedMember]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("profileId", profileId);
    formData.set("contractType", contractType);
    formData.set("status", status);
    formData.set("title", title);
    formData.set("startDate", startDate);
    formData.set("endDate", endDate);
    formData.set("monthlySalary", monthlySalary);
    formData.set("commissionRate", commissionRate);
    formData.set("notes", notes);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erstellen fehlgeschlagen");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Vertrag erstellen" size="lg">
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Person">
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            required
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name?.trim() || member.email} ({member.email})
              </option>
            ))}
          </select>
        </Field>

        {selectedMember && (
          <p className="text-xs text-muted-soft">
            Rolle: {getAgencyRoleLabel(selectedMember.agency_role)} · Beschäftigung:{" "}
            {getEmploymentTypeLabel(selectedMember.employment_type)}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vertragstyp">
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value as ContractType)}
              className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
            >
              {CONTRACT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CONTRACT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContractStatus)}
              className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
            >
              {CONTRACT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {CONTRACT_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Titel">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Beginn">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Ende">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monatsgehalt (optional)">
            <input
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
              placeholder="z. B. 3.500,00"
              className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Provision % (optional)">
            <input
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              placeholder="z. B. 10"
              className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <Field label="Notizen">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>

        <p className="text-xs text-muted-soft">
          Die Vertragsnummer wird automatisch im Format CTR-2026-000001 vergeben.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="dashboard-btn-secondary px-4 py-2 text-sm"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={pending}
            className="dashboard-btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {pending ? "Wird erstellt…" : "Vertrag erstellen"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
