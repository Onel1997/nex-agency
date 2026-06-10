"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { getAssignableRoles } from "@/lib/auth/permissions";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/types";

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (formData: FormData) => Promise<void>;
  currentUserRole: UserRole;
}

export function InviteMemberModal({
  open,
  onClose,
  onInvite,
  currentUserRole,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignableRoles = getAssignableRoles(currentUserRole).filter(
    (r) => r !== "super_admin" || currentUserRole === "super_admin",
  );
  const selectableRoles =
    assignableRoles.length > 0 ? assignableRoles : (["employee"] as UserRole[]);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    const roles = getAssignableRoles(currentUserRole).filter(
      (r) => r !== "super_admin" || currentUserRole === "super_admin",
    );
    const defaultRole = roles.includes("employee") ? "employee" : roles[0] ?? "employee";
    setRole(defaultRole);
    setError(null);
  }, [open, currentUserRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("role", role);

    try {
      await onInvite(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Einladung fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <span className="mb-1.5 block text-xs font-medium text-muted">Rolle</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="dashboard-input"
          >
            {selectableRoles.map((option) => (
              <option key={option} value={option}>
                {ROLE_LABELS[option]}
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
