"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import {
  canManageMember,
  getAssignableRoles,
} from "@/lib/auth/permissions";
import { getRoleLabel, roleSelectOptions } from "@/lib/auth/roles";
import type { Profile, UserRole } from "@/lib/auth/types";
import { parsePercent } from "@/lib/dashboard/format";
import type { TeamMember } from "@/lib/dashboard/types";

export interface EditTeamMemberData {
  full_name: string;
  role: UserRole;
  commission_rate: number;
}

interface EditTeamMemberModalProps {
  open: boolean;
  member: TeamMember | null;
  currentUserId: string;
  currentUserProfile: Pick<Profile, "id" | "role">;
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
  const [role, setRole] = useState<UserRole>("employee");
  const [commissionRate, setCommissionRate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignableRoles = getAssignableRoles(currentUserProfile.role);
  const isSelf = member?.id === currentUserId;
  const canManage =
    member != null && canManageMember(currentUserProfile, { role: member.role });
  const canChangeRole = !isSelf && canManage && assignableRoles.length > 0;
  const roleOptions = member
    ? roleSelectOptions(assignableRoles, member.role)
    : assignableRoles;

  useEffect(() => {
    if (!open || !member) return;
    setFullName(member.full_name?.trim() ?? "");
    setRole(member.role);
    setCommissionRate(String(member.commission_rate));
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

    const rate = parsePercent(commissionRate);
    if (rate == null) {
      setError("Bitte einen gültigen Prozentsatz zwischen 0 und 100 eingeben.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(member.id, {
        full_name: trimmedName,
        role: canChangeRole ? role : member.role,
        commission_rate: rate,
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
          Super Admins können nur von Super Admins bearbeitet werden.
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
          <span className="mb-1.5 block text-xs font-medium text-muted">Rolle</span>
          {canChangeRole ? (
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="dashboard-input"
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {getRoleLabel(option)}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              readOnly
              value={getRoleLabel(member.role)}
              className="dashboard-input cursor-not-allowed opacity-70"
              tabIndex={-1}
            />
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Provisionssatz (%)
          </span>
          <input
            type="text"
            inputMode="decimal"
            required
            disabled={!canManage}
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            className="dashboard-input"
            placeholder="10"
          />
        </label>

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
