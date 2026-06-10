"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus, Users } from "lucide-react";
import {
  inviteTeamMember,
  setMemberActive,
  updateMemberRole,
} from "@/app/dashboard/team/actions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { InviteMemberModal } from "@/components/dashboard/InviteMemberModal";
import { TeamTable } from "@/components/dashboard/TeamTable";
import type { TeamMember } from "@/lib/dashboard/types";
import type { UserRole } from "@/lib/auth/types";

interface TeamPageClientProps {
  members: TeamMember[];
  currentUserId: string;
}

export function TeamPageClient({ members, currentUserId }: TeamPageClientProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);

  const refresh = () => router.refresh();

  const handleInvite = async (formData: FormData) => {
    await inviteTeamMember(formData);
    refresh();
  };

  const handleRoleChange = async (memberId: string, role: UserRole) => {
    await updateMemberRole(memberId, role);
    refresh();
  };

  const handleToggleActive = async (memberId: string, isActive: boolean) => {
    await setMemberActive(memberId, isActive);
    refresh();
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
          onRoleChange={handleRoleChange}
          onToggleActive={handleToggleActive}
        />
      )}

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
      />
    </div>
  );
}
