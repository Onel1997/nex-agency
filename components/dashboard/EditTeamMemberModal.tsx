"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import {
  canManageMember,
  getAssignableAgencyRoles,
  type PermissionActor,
} from "@/lib/auth/permissions";
import {
  agencyRoleSelectOptions,
  employmentTypeSelectOptions,
  getAgencyRoleLabel,
  getEmploymentTypeLabel,
} from "@/lib/auth/roles";
import type { AgencyRole, EmploymentType } from "@/lib/auth/types";
import { parsePercent } from "@/lib/dashboard/format";
import type { TeamMember } from "@/lib/dashboard/types";

export interface EditTeamMemberData {
  full_name: string;
  employment_type: EmploymentType;
  agency_role: AgencyRole;
  setter_commission_rate: number;
  closer_commission_rate: number;
  retainer_commission_rate: number;
  retainer_commission_months: number;
}

interface EditTeamMemberModalProps {
  open: boolean;
  member: TeamMember | null;
  currentUserId: string;
  currentUserProfile: PermissionActor;
  onClose: () => void;
  onSave: (memberId: string, data: EditTeamMemberData) => Promise<void>;
}

export function EditTeamMemberModal({
  open,
  member,
  currentUserId,
  currentUserProfile,
  onClose,
  onSave,
}: EditTeamMemberModalProps) {
  const [fullName, setFullName] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("employee");
  const [agencyRole, setAgencyRole] = useState<AgencyRole>("setter");
  const [setterCommissionRate, setSetterCommissionRate] = useState("");
  const [closerCommissionRate, setCloserCommissionRate] = useState("");
  const [retainerCommissionRate, setRetainerCommissionRate] = useState("");
  const [retainerCommissionMonths, setRetainerCommissionMonths] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignableRoles = getAssignableAgencyRoles(currentUserProfile);
  const isSelf = member?.id === currentUserId;
  const canManage =
    member != null &&
    canManageMember(currentUserProfile, { agency_role: member.agency_role, role: member.role });
  const canChangeRole = !isSelf && canManage && assignableRoles.length > 0;
  const roleOptions = member
    ? agencyRoleSelectOptions(assignableRoles, member.agency_role)
    : assignableRoles;

  useEffect(() => {
    if (!open || !member) return;
    setFullName(member.full_name?.trim() ?? "");
    setEmploymentType(member.employment_type);
    setAgencyRole(member.agency_role);
    setSetterCommissionRate(String(member.setter_commission_rate));
    setCloserCommissionRate(String(member.closer_commission_rate));
    setRetainerCommissionRate(String(member.retainer_commission_rate));
    setRetainerCommissionMonths(String(member.retainer_commission_months));
    setError(null);
  }, [open, member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !canManage) return;

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Vollständiger Name ist erforderlich");
      return;
    }

    const setterRate = parsePercent(setterCommissionRate);
    const closerRate = parsePercent(closerCommissionRate);
    const retainerRate = parsePercent(retainerCommissionRate);
    const retainerMonths = Number.parseInt(retainerCommissionMonths, 10);
    if (setterRate == null || closerRate == null || retainerRate == null) {
      setError("Bitte gültige Prozentsätze zwischen 0 und 100 eingeben.");
      return;
    }
    if (
      !Number.isFinite(retainerMonths) ||
      retainerMonths < 0 ||
      retainerMonths > 120
    ) {
      setError("Retainer-Provisionsdauer muss zwischen 0 und 120 Monaten liegen.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(member.id, {
        full_name: trimmedName,
        employment_type: employmentType,
        agency_role: canChangeRole ? agencyRole : member.agency_role,
        setter_commission_rate: setterRate,
        closer_commission_rate: closerRate,
        retainer_commission_rate: retainerRate,
        retainer_commission_months: retainerMonths,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!member) return null;

  return (
    <Modal open={open} onClose={onClose} title="Teammitglied bearbeiten" size="md">
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </p>
      )}

      {!canManage && (
        <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-500/20">
          Owner können nur von Ownern bearbeitet werden.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">E-Mail</span>
          <input
            type="email"
            readOnly
            value={member.email}
            className="dashboard-input cursor-not-allowed opacity-70"
            tabIndex={-1}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Vollständiger Name <span className="text-violet-400">*</span>
          </span>
          <input
            type="text"
            required
            disabled={!canManage}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="dashboard-input"
            placeholder="Max Mustermann"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Beschäftigungsart
          </span>
          <select
            disabled={!canManage}
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
            className="dashboard-input"
          >
            {employmentTypeSelectOptions().map((option) => (
              <option key={option} value={option}>
                {getEmploymentTypeLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Agenturrolle</span>
          {canChangeRole ? (
            <select
              value={agencyRole}
              onChange={(e) => setAgencyRole(e.target.value as AgencyRole)}
              className="dashboard-input"
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {getAgencyRoleLabel(option)}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              readOnly
              value={getAgencyRoleLabel(member.agency_role)}
              className="dashboard-input cursor-not-allowed opacity-70"
              tabIndex={-1}
            />
          )}
        </label>

        <div className="space-y-3 rounded-xl border border-border/60 bg-black/10 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-soft">
            Provisionen
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">
                Setup-Provision Setter (%)
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                disabled={!canManage}
                value={setterCommissionRate}
                onChange={(e) => setSetterCommissionRate(e.target.value)}
                className="dashboard-input"
                placeholder="0"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">
                Setup-Provision Closer (%)
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                disabled={!canManage}
                value={closerCommissionRate}
                onChange={(e) => setCloserCommissionRate(e.target.value)}
                className="dashboard-input"
                placeholder="10"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">
                Retainer-Provision (%)
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                disabled={!canManage}
                value={retainerCommissionRate}
                onChange={(e) => setRetainerCommissionRate(e.target.value)}
                className="dashboard-input"
                placeholder="10"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">
                Retainer-Provisionsdauer (Monate)
              </span>
              <input
                type="number"
                min={0}
                max={120}
                required
                disabled={!canManage}
                value={retainerCommissionMonths}
                onChange={(e) => setRetainerCommissionMonths(e.target.value)}
                className="dashboard-input"
                placeholder="3"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="dashboard-btn-secondary">
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !canManage}
            className="dashboard-btn-primary"
          >
            {isSubmitting ? "Speichern..." : "Änderungen speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
