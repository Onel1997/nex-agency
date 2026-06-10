"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Target } from "lucide-react";
import {
  createLead,
  deleteLead,
  updateLead,
  updateLeadStatus,
} from "@/app/dashboard/leads/actions";
import { DashboardHeader } from "./DashboardHeader";
import { EmptyState } from "./EmptyState";
import { LeadModal } from "./LeadModal";
import { LeadsTable } from "./LeadsTable";
import type { LeadFormData } from "./LeadForm";
import type { Lead, TeamMember } from "@/lib/dashboard/types";
import type { LeadStatus } from "@/lib/dashboard/constants";

interface LeadsPageClientProps {
  leads: Lead[];
  canAssign: boolean;
  teamMembers: TeamMember[];
  currentUserId: string;
}

export function LeadsPageClient({
  leads,
  canAssign,
  teamMembers,
  currentUserId,
}: LeadsPageClientProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Lead wirklich löschen?")) return;
    await deleteLead(id);
    refresh();
  };

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    await updateLeadStatus(id, status);
    refresh();
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Leads"
        description={
          canAssign
            ? "Verwalte alle Team-Leads und weise sie Mitarbeitern zu."
            : "Verwalte deine Leads und den Status in der Pipeline."
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
          showAssignee={canAssign}
          onEdit={setEditLead}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}

      <LeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        onSave={handleCreate}
        canAssign={canAssign}
        teamMembers={teamMembers}
        defaultAssigneeId={currentUserId}
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
          defaultAssigneeId={currentUserId}
        />
      )}
    </div>
  );
}
