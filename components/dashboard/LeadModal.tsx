"use client";

import { useEffect, useMemo, useState } from "react";
import { LeadForm, emptyLeadForm, leadToFormData, type LeadFormData } from "./LeadForm";
import { Modal } from "./Modal";
import type { Profile } from "@/lib/auth/types";
import {
  canChangeLeadStatus,
  getSelectableLeadStatuses,
  getVisibleLeadStatuses,
} from "@/lib/dashboard/lead-pipeline";
import type { Lead, TeamMember } from "@/lib/dashboard/types";

interface LeadModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  lead?: Lead;
  onSave: (data: LeadFormData) => Promise<void>;
  canAssign?: boolean;
  teamMembers?: TeamMember[];
  defaultOwnerId?: string;
  profile: Profile;
}

export function LeadModal({
  open,
  onClose,
  mode,
  lead,
  onSave,
  canAssign = false,
  teamMembers = [],
  defaultOwnerId,
  profile,
}: LeadModalProps) {
  const [data, setData] = useState<LeadFormData>(
    lead ? leadToFormData(lead) : emptyLeadForm,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setData(lead ? leadToFormData(lead) : emptyLeadForm);
    setError(null);
  }, [open, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(data);
      onClose();
      setData(emptyLeadForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formId = mode === "create" ? "create-lead-form" : "edit-lead-form";
  const allowedStatuses = useMemo(() => {
    if (mode === "create") {
      return getVisibleLeadStatuses(profile);
    }
    if (!lead) return getVisibleLeadStatuses(profile);
    return getSelectableLeadStatuses(profile, lead);
  }, [mode, profile, lead]);
  const statusDisabled =
    mode === "edit" &&
    Boolean(lead) &&
    (!canChangeLeadStatus(profile, lead!) || lead!.status === "won");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Lead hinzufügen" : "Lead bearbeiten"}
      size="lg"
    >
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </p>
      )}
      <LeadForm
        formId={formId}
        data={data}
        onChange={setData}
        onSubmit={handleSubmit}
        submitLabel={mode === "create" ? "Lead erstellen" : "Änderungen speichern"}
        isSubmitting={isSubmitting}
        canAssign={canAssign}
        teamMembers={teamMembers}
        defaultOwnerId={defaultOwnerId}
        creatorName={lead?.creator_name}
        mode={mode}
        allowedStatuses={allowedStatuses}
        statusDisabled={statusDisabled}
      />
    </Modal>
  );
}
