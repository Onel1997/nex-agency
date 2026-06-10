"use client";

import { useEffect, useState } from "react";
import {
  ClientForm,
  clientToFormData,
  type ClientFormData,
} from "./ClientForm";
import { Modal } from "./Modal";
import type { ClientRecord, TeamMember } from "@/lib/dashboard/types";

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  client: ClientRecord;
  onSave: (data: ClientFormData) => Promise<void>;
  canAssign?: boolean;
  teamMembers?: TeamMember[];
}

export function ClientModal({
  open,
  onClose,
  client,
  onSave,
  canAssign = false,
  teamMembers = [],
}: ClientModalProps) {
  const [data, setData] = useState<ClientFormData>(clientToFormData(client));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setData(clientToFormData(client));
    setError(null);
  }, [open, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Kunde bearbeiten" size="lg">
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </p>
      )}
      <ClientForm
        formId="edit-client-form"
        data={data}
        onChange={setData}
        onSubmit={handleSubmit}
        submitLabel="Änderungen speichern"
        isSubmitting={isSubmitting}
        canAssign={canAssign}
        teamMembers={teamMembers}
        companyName={client.company_name}
      />
    </Modal>
  );
}
