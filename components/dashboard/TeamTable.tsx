"use client";

import { formatDate } from "@/lib/dashboard/format";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/types";
import type { TeamMember } from "@/lib/dashboard/types";
import { DataTable } from "./DataTable";
import { TeamMemberStatusBadge } from "./TeamMemberStatusBadge";

interface TeamTableProps {
  members: TeamMember[];
  currentUserId: string;
  onRoleChange: (memberId: string, role: UserRole) => Promise<void>;
  onToggleActive: (memberId: string, isActive: boolean) => Promise<void>;
  onDelete: (memberId: string) => Promise<void>;
}

export function TeamTable({
  members,
  currentUserId,
  onRoleChange,
  onToggleActive,
  onDelete,
}: TeamTableProps) {
  return (
    <DataTable
      data={members}
      rowKey={(member) => member.id}
      columns={[
        {
          key: "name",
          header: "Name",
          render: (member) => (
            <div>
              <div className="font-medium text-foreground">
                {member.full_name?.trim() || member.email.split("@")[0]}
              </div>
              <div className="text-xs text-muted-soft">{member.email}</div>
            </div>
          ),
        },
        {
          key: "role",
          header: "Rolle",
          render: (member) =>
            member.id === currentUserId ? (
              <span className="text-muted">{ROLE_LABELS[member.role]}</span>
            ) : (
              <select
                value={member.role}
                onChange={(e) =>
                  onRoleChange(member.id, e.target.value as UserRole)
                }
                className="dashboard-select-sm"
                aria-label={`Rolle für ${member.email}`}
              >
                <option value="employee">{ROLE_LABELS.employee}</option>
                <option value="admin">{ROLE_LABELS.admin}</option>
              </select>
            ),
        },
        {
          key: "status",
          header: "Status",
          hideOnMobile: true,
          render: (member) => <TeamMemberStatusBadge status={member.status} />,
        },
        {
          key: "created",
          header: "Erstellt am",
          hideOnMobile: true,
          render: (member) => formatDate(member.created_at),
        },
        {
          key: "actions",
          header: "Aktionen",
          className: "w-[220px]",
          render: (member) =>
            member.id === currentUserId ? (
              <span className="text-xs text-muted-soft">—</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {member.status === "active" && (
                  <button
                    type="button"
                    onClick={() => onToggleActive(member.id, false)}
                    className="dashboard-btn-secondary px-3 py-1.5 text-xs"
                  >
                    Deaktivieren
                  </button>
                )}
                {member.status === "deactivated" && (
                  <button
                    type="button"
                    onClick={() => onToggleActive(member.id, true)}
                    className="dashboard-btn-secondary px-3 py-1.5 text-xs"
                  >
                    Reaktivieren
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(member.id)}
                  className="dashboard-btn-secondary px-3 py-1.5 text-xs text-red-300 hover:border-red-500/35 hover:bg-red-500/10"
                >
                  Löschen
                </button>
              </div>
            ),
        },
      ]}
    />
  );
}
