"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Target } from "lucide-react";
import {
  convertLeadToClient,
  createLead,
  deleteLead,
  updateLead,
  updateLeadStatus,
} from "@/app/dashboard/leads/actions";
import { ConfirmDialog } from "./ConfirmDialog";
import { DashboardHeader } from "./DashboardHeader";
import { EmptyState } from "./EmptyState";
import { LeadModal } from "./LeadModal";
import { LeadsTable } from "./LeadsTable";
import { Toast } from "./Toast";
import type { LeadFormData } from "./LeadForm";
import type { Lead, TeamMember } from "@/lib/dashboard/types";
import type { LeadStatus } from "@/lib/dashboard/constants";

interface LeadsPageClientProps {
  leads: Lead[];
  canAssign: boolean;
  canMarkLeadWon: boolean;
  canConvertLead: boolean;
  showOwnership: boolean;
  teamMembers: TeamMember[];
  currentUserId: string;
}

export function LeadsPageClient({
  leads,
  canAssign,
  canMarkLeadWon,
  canConvertLead,
  showOwnership,
  teamMembers,
  currentUserId,
}: LeadsPageClientProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const handleCreate = async (data: LeadFormData) => {
    await createLead(data);
    refresh();
  };

  const handleEdit = async (data: LeadFormData) => {
    if (!editLead) return;
    await updateLead(editLead.id, data);
    setEditLead(null);
    refresh();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setError(null);
    try {
      await deleteLead(deleteTarget.id);
      setDeleteTarget(null);
      setToast("Lead erfolgreich gelöscht");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lead konnte nicht gelöscht werden");
    }
  };

  const handleMarkWon = async (leadId: string) => {
    await updateLeadStatus(leadId, "won");
    refresh();
  };

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    await updateLeadStatus(id, status);
    refresh();
  };

  const handleConvert = async (leadId: string) => {
    await convertLeadToClient(leadId);
    refresh();
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Leads"
        description={
          canAssign
            ? "Verwalte alle Team-Leads, Betreuer und geschätzte Werte."
            : "Verwalte deine Leads, Pipeline und geschätzte Werte."
        }
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="dashboard-btn-primary"
          >
            <Plus className="h-4 w-4" />
            Lead hinzufügen
          </button>
        }
      />

      {error ? (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      ) : null}

      {leads.length === 0 ? (
        <div className="glass-card rounded-2xl">
          <EmptyState
            icon={Target}
            title="Noch keine Leads"
            description="Lege den ersten Lead an, um deine Pipeline zu starten."
          />
          <div className="flex justify-center pb-8">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="dashboard-btn-primary"
            >
              <Plus className="h-4 w-4" />
              Lead hinzufügen
            </button>
          </div>
        </div>
      ) : (
        <LeadsTable
          leads={leads}
          showOwnership={showOwnership}
          canMarkLeadWon={canMarkLeadWon}
          canConvertLead={canConvertLead}
          onEdit={setEditLead}
          onDelete={setDeleteTarget}
          onStatusChange={handleStatusChange}
          onMarkWon={handleMarkWon}
          onConvert={handleConvert}
        />
      )}

      <LeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        onSave={handleCreate}
        canAssign={canAssign}
        teamMembers={teamMembers}
        defaultOwnerId={currentUserId}
      />

      {editLead && (
        <LeadModal
          key={editLead.id}
          open={Boolean(editLead)}
          onClose={() => setEditLead(null)}
          mode="edit"
          lead={editLead}
          onSave={handleEdit}
          canAssign={canAssign}
          teamMembers={teamMembers}
          defaultOwnerId={currentUserId}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Lead löschen"
        description="Möchten Sie diesen Lead wirklich löschen?"
        confirmLabel="Lead löschen"
        variant="danger"
        onConfirm={handleDeleteConfirm}
      >
        {deleteTarget ? (
          <dl className="space-y-2 rounded-xl bg-surface/50 px-4 py-3 text-sm ring-1 ring-border">
            <div>
              <dt className="text-muted-soft">Firmenname</dt>
              <dd className="font-medium text-foreground">{deleteTarget.company_name}</dd>
            </div>
            <div>
              <dt className="text-muted-soft">Ansprechpartner</dt>
              <dd className="text-foreground">{deleteTarget.contact_name || "—"}</dd>
            </div>
          </dl>
        ) : null}
      </ConfirmDialog>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
