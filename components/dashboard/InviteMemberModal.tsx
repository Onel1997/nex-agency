"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { getAssignableAgencyRoles, type PermissionActor } from "@/lib/auth/permissions";
import {
  agencyRoleSelectOptions,
  employmentTypeSelectOptions,
  getAgencyRoleLabel,
  getEmploymentTypeLabel,
} from "@/lib/auth/roles";
import type { AgencyRole, EmploymentType } from "@/lib/auth/types";

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (formData: FormData) => Promise<void>;
  currentUserProfile: PermissionActor;
}

export function InviteMemberModal({
  open,
  onClose,
  onInvite,
  currentUserProfile,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("employee");
  const [agencyRole, setAgencyRole] = useState<AgencyRole>("setter");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignableRoles = getAssignableAgencyRoles(currentUserProfile).filter(
    (role) => role !== "owner" || currentUserProfile.agency_role === "owner",
  );
  const selectableRoles =
    assignableRoles.length > 0 ? assignableRoles : (["setter"] as AgencyRole[]);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setEmploymentType("employee");
    const roles = getAssignableAgencyRoles(currentUserProfile).filter(
      (role) => role !== "owner" || currentUserProfile.agency_role === "owner",
    );
    const defaultRole = roles.includes("setter") ? "setter" : roles[0] ?? "setter";
    setAgencyRole(defaultRole);
    setError(null);
  }, [open, currentUserProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("employment_type", employmentType);
    formData.set("agency_role", agencyRole);

    try {
      await onInvite(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Einladung fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions = agencyRoleSelectOptions(selectableRoles, agencyRole);

  return (
    <Modal open={open} onClose={onClose} title="Teammitglied einladen" size="md">
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            E-Mail <span className="text-violet-400">*</span>
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="dashboard-input"
            placeholder="mitarbeiter@nexagency.de"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Beschäftigungsart
          </span>
          <select
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
        </label>

        <p className="text-xs leading-relaxed text-muted-soft">
          Die Person erhält eine Einladungs-E-Mail von Supabase und kann dort
          ein Passwort festlegen.
        </p>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="dashboard-btn-secondary"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="dashboard-btn-primary"
          >
            {isSubmitting ? "Senden..." : "Einladung senden"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
