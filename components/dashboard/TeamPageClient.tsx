"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus, Users } from "lucide-react";
import {
  deleteMember,
  inviteTeamMember,
  setMemberActive,
  updateMemberAgencyRole,
  updateTeamMember,
} from "@/app/dashboard/team/actions";
import type { AgencyRole, Profile } from "@/lib/auth/types";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EditTeamMemberModal } from "@/components/dashboard/EditTeamMemberModal";
import type { EditTeamMemberData } from "@/components/dashboard/EditTeamMemberModal";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { InviteMemberModal } from "@/components/dashboard/InviteMemberModal";
import { TeamTable } from "@/components/dashboard/TeamTable";
import { Toast } from "@/components/dashboard/Toast";
import type { TeamMember } from "@/lib/dashboard/types";

interface TeamPageClientProps {
  members: TeamMember[];
  currentUserId: string;
  currentUserProfile: Profile;
}

export function TeamPageClient({
  members,
  currentUserId,
  currentUserProfile,
}: TeamPageClientProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const runAction = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktion fehlgeschlagen");
    }
  };

  const handleInvite = async (formData: FormData) => {
    await runAction(async () => {
      await inviteTeamMember(formData);
      setInviteOpen(false);
    });
  };

  const handleRoleChange = async (memberId: string, role: AgencyRole) => {
    await runAction(() => updateMemberAgencyRole(memberId, role));
  };

  const handleToggleActive = async (memberId: string, isActive: boolean) => {
    await runAction(() => setMemberActive(memberId, isActive));
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm("Benutzer wirklich löschen?")) return;
    await runAction(() => deleteMember(memberId));
  };

  const handleEdit = async (memberId: string, data: EditTeamMemberData) => {
    setError(null);
    try {
      await updateTeamMember(memberId, data);
      setEditMember(null);
      setToast("Teammitglied aktualisiert");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Team"
        description="Teammitglieder verwalten, einladen und Rollen zuweisen."
        actions={
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="dashboard-btn-primary"
          >
            <UserPlus className="h-4 w-4" />
            Teammitglied einladen
          </button>
        }
      />

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      {members.length === 0 ? (
        <div className="glass-card rounded-2xl">
          <EmptyState
            icon={Users}
            title="Noch keine Teammitglieder"
            description="Lade das erste Teammitglied per E-Mail ein."
          />
        </div>
      ) : (
        <TeamTable
          members={members}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          onEdit={setEditMember}
          onRoleChange={handleRoleChange}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
      )}

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
        currentUserProfile={currentUserProfile}
      />

      {editMember && (
        <EditTeamMemberModal
          key={editMember.id}
          open={Boolean(editMember)}
          member={editMember}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          onClose={() => setEditMember(null)}
          onSave={handleEdit}
        />
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
