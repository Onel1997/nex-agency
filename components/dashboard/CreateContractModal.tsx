"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import {
  CONTRACT_CATEGORIES,
  CONTRACT_CATEGORY_LABELS,
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
  FREELANCER_CONTRACT_TYPES,
  type ContractCategory,
  type ContractType,
} from "@/lib/dashboard/contract-constants";
import {
  defaultContractCategoryForProfile,
  defaultContractTitle,
  defaultContractTypeForProfile,
} from "@/lib/dashboard/contract-form";
import type { ContractWithDetails, TeamMember } from "@/lib/dashboard/types";
import { centsToEuroInput } from "@/lib/dashboard/format";
import { getAgencyRoleLabel, getEmploymentTypeLabel } from "@/lib/auth/roles";

interface CreateContractModalProps {
  open: boolean;
  members: TeamMember[];
  preselectedProfileId?: string | null;
  defaultCategory?: ContractCategory;
  editContract?: ContractWithDetails | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  pending?: boolean;
}

const FREELANCER_TYPES = FREELANCER_CONTRACT_TYPES as readonly ContractType[];

export function CreateContractModal({
  open,
  members,
  preselectedProfileId,
  defaultCategory = "freelancer",
  editContract = null,
  onClose,
  onSubmit,
  pending = false,
}: CreateContractModalProps) {
  const isEditMode = Boolean(editContract);
  const [profileId, setProfileId] = useState(preselectedProfileId ?? members[0]?.id ?? "");
  const [contractCategory, setContractCategory] = useState<ContractCategory>(defaultCategory);
  const [contractType, setContractType] = useState<ContractType>("freelancer");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [workingHoursPerWeek, setWorkingHoursPerWeek] = useState("");
  const [vacationDaysPerYear, setVacationDaysPerYear] = useState("");
  const [setupCommissionRate, setSetupCommissionRate] = useState("");
  const [retainerCommissionRate, setRetainerCommissionRate] = useState("");
  const [retainerCommissionMonths, setRetainerCommissionMonths] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === profileId) ?? null,
    [members, profileId],
  );

  const availableTypes = useMemo(
    () =>
      contractCategory === "employee"
        ? (["employee"] as ContractType[])
        : [...FREELANCER_TYPES],
    [contractCategory],
  );

  useEffect(() => {
    if (!open) return;

    if (editContract) {
      setProfileId(editContract.profile_id);
      setContractCategory(editContract.contract_category);
      setContractType(editContract.contract_type);
      setTitle(editContract.title);
      setStartDate(editContract.start_date ?? "");
      setEndDate(editContract.end_date ?? "");
      setMonthlySalary(centsToEuroInput(editContract.monthly_salary_cents));
      setWorkingHoursPerWeek(
        editContract.working_hours_per_week != null
          ? String(editContract.working_hours_per_week)
          : "",
      );
      setVacationDaysPerYear(
        editContract.vacation_days_per_year != null
          ? String(editContract.vacation_days_per_year)
          : "",
      );
      setSetupCommissionRate(
        editContract.setup_commission_rate != null
          ? String(editContract.setup_commission_rate)
          : "",
      );
      setRetainerCommissionRate(
        editContract.retainer_commission_rate != null
          ? String(editContract.retainer_commission_rate)
          : "",
      );
      setRetainerCommissionMonths(
        editContract.retainer_commission_months != null
          ? String(editContract.retainer_commission_months)
          : "",
      );
      setCommissionRate(
        editContract.commission_rate != null ? String(editContract.commission_rate) : "",
      );
      setNotes(editContract.notes ?? "");
      setError(null);
      return;
    }

    const nextProfileId = preselectedProfileId ?? members[0]?.id ?? "";
    setProfileId(nextProfileId);
    setContractCategory(defaultCategory);
    setStartDate("");
    setEndDate("");
    setMonthlySalary("");
    setWorkingHoursPerWeek("");
    setVacationDaysPerYear("");
    setSetupCommissionRate("");
    setRetainerCommissionRate("");
    setRetainerCommissionMonths("");
    setCommissionRate("");
    setNotes("");
    setError(null);
  }, [open, members, preselectedProfileId, defaultCategory, editContract]);

  useEffect(() => {
    if (!selectedMember || editContract) return;
    const category = defaultCategory || defaultContractCategoryForProfile(selectedMember);
    setContractCategory(category);
    const nextType = defaultContractTypeForProfile(selectedMember);
    setContractType(category === "employee" ? "employee" : nextType);
    setTitle(defaultContractTitle(selectedMember));
    setSetupCommissionRate(String(selectedMember.setter_commission_rate || ""));
    setRetainerCommissionRate(String(selectedMember.retainer_commission_rate || ""));
    setRetainerCommissionMonths(String(selectedMember.retainer_commission_months || ""));
    setCommissionRate(
      String(
        selectedMember.closer_commission_rate ||
          selectedMember.setter_commission_rate ||
          "",
      ),
    );
  }, [selectedMember, defaultCategory, editContract]);

  useEffect(() => {
    if (contractCategory === "employee") {
      setContractType("employee");
    } else if (contractType === "employee") {
      setContractType("freelancer");
    }
  }, [contractCategory, contractType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("profileId", profileId);
    formData.set("contractCategory", contractCategory);
    formData.set("contractType", contractType);
    formData.set("status", "draft");
    formData.set("title", title);
    formData.set("startDate", startDate);
    formData.set("endDate", endDate);
    formData.set("monthlySalary", monthlySalary);
    formData.set("workingHoursPerWeek", workingHoursPerWeek);
    formData.set("vacationDaysPerYear", vacationDaysPerYear);
    formData.set("setupCommissionRate", setupCommissionRate);
    formData.set("retainerCommissionRate", retainerCommissionRate);
    formData.set("retainerCommissionMonths", retainerCommissionMonths);
    formData.set("commissionRate", commissionRate);
    formData.set("agencyRole", selectedMember?.agency_role ?? "");
    formData.set("notes", notes);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erstellen fehlgeschlagen");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditMode ? "Vertrag bearbeiten" : "Vertrag erstellen"}
      size="lg"
    >
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Vertragskategorie">
          <select
            value={contractCategory}
            onChange={(e) => setContractCategory(e.target.value as ContractCategory)}
            disabled={isEditMode}
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm disabled:opacity-60"
          >
            {CONTRACT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CONTRACT_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Person">
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            required
            disabled={isEditMode}
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm disabled:opacity-60"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name?.trim() || member.email} ({member.email})
              </option>
            ))}
          </select>
        </Field>

        {selectedMember && (
          <div className="space-y-1 text-xs text-muted-soft">
            <p>
              Rolle: {getAgencyRoleLabel(selectedMember.agency_role)} · Beschäftigung:{" "}
              {getEmploymentTypeLabel(selectedMember.employment_type)}
            </p>
            <p>
              Bank-, Adress- und Steuerdaten werden automatisch aus den Team-Stammdaten
              geladen und im Vertrags-PDF verwendet.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vertragstyp">
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value as ContractType)}
              className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
            >
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {CONTRACT_TYPE_LABELS[type]}
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

        {contractCategory === "employee" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Monatsgehalt">
              <input
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                placeholder="z. B. 3.500,00"
                className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Arbeitszeit (Std./Woche)">
              <input
                value={workingHoursPerWeek}
                onChange={(e) => setWorkingHoursPerWeek(e.target.value)}
                placeholder="z. B. 40"
                className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Urlaubstage/Jahr">
              <input
                value={vacationDaysPerYear}
                onChange={(e) => setVacationDaysPerYear(e.target.value)}
                placeholder="z. B. 28"
                className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
              />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Setup-Provision %">
              <input
                value={setupCommissionRate}
                onChange={(e) => setSetupCommissionRate(e.target.value)}
                placeholder="z. B. 10"
                className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Retainer-Provision %">
              <input
                value={retainerCommissionRate}
                onChange={(e) => setRetainerCommissionRate(e.target.value)}
                placeholder="z. B. 10"
                className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Retainer-Monate">
              <input
                value={retainerCommissionMonths}
                onChange={(e) => setRetainerCommissionMonths(e.target.value)}
                placeholder="z. B. 3"
                className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Allgemeine Provision % (optional)">
              <input
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="z. B. 10"
                className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
              />
            </Field>
          </div>
        )}

        <Field label="Notizen">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="dashboard-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </Field>

        <p className="text-xs text-muted-soft">
          Zahlungs- und Steuerdaten werden aus dem Freelancer-Profil in das PDF übernommen.
          Vertragsnummer: CTR-YYYY-000001
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="dashboard-btn-secondary px-4 py-2 text-sm">
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={pending}
            className="dashboard-btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {pending
              ? isEditMode
                ? "Wird gespeichert…"
                : "Wird erstellt…"
              : isEditMode
                ? "Änderungen speichern"
                : "Vertrag erstellen"}
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
