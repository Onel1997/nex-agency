"use client";

import { formatDate, formatPercent } from "@/lib/dashboard/format";
import {
  canManageMember,
  getAssignableRoles,
} from "@/lib/auth/permissions";
import { getRoleLabel, normalizeUserRole, roleSelectOptions } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/types";
import type { TeamMember } from "@/lib/dashboard/types";
import type { Profile } from "@/lib/auth/types";
import { DataTable } from "./DataTable";
import { TeamMemberStatusBadge } from "./TeamMemberStatusBadge";

interface TeamTableProps {
  members: TeamMember[];
  currentUserId: string;
  currentUserRole: UserRole;
  currentUserProfile: Pick<Profile, "id" | "role">;
  onEdit: (member: TeamMember) => void;
  onRoleChange: (memberId: string, role: UserRole) => Promise<void>;
  onToggleActive: (memberId: string, isActive: boolean) => Promise<void>;
  onDelete: (memberId: string) => Promise<void>;
}

export function TeamTable({
  members,
  currentUserId,
  currentUserRole,
  currentUserProfile,
  onEdit,
  onRoleChange,
  onToggleActive,
  onDelete,
}: TeamTableProps) {
  const assignableRoles = getAssignableRoles(currentUserRole);

  return (
    <DataTable
      data={members}
      rowKey={(member) => member.id}
      columns={[
        {
          key: "name",
          header: "Name",
          render: (member) => (
            <div className="font-medium text-foreground">
              {member.full_name?.trim() || "—"}
            </div>
          ),
        },
        {
          key: "email",
          header: "E-Mail",
          hideOnMobile: true,
          render: (member) => (
            <span className="text-muted">{member.email}</span>
          ),
        },
        {
          key: "role",
          header: "Rolle",
          render: (member) => {
            const memberRole = normalizeUserRole(member.role) ?? member.role;
            const canEditRole =
              member.id !== currentUserId &&
              canManageMember(currentUserProfile, { role: memberRole });

            if (!canEditRole) {
              return (
                <span className="text-muted">{getRoleLabel(member.role)}</span>
              );
            }

            const options = roleSelectOptions(assignableRoles, member.role);

            return (
              <select
                value={memberRole}
                onChange={(e) =>
                  onRoleChange(member.id, e.target.value as UserRole)
                }
                className="dashboard-select-sm"
                aria-label={`Rolle für ${member.email}`}
              >
                {options.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>
            );
          },
        },
        {
          key: "commission",
          header: "Provision",
          className: "text-right",
          hideOnMobile: true,
          render: (member) => (
            <span className="tabular-nums text-foreground">
              {formatPercent(member.commission_rate)}
            </span>
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
          className: "w-[260px]",
          render: (member) => {
            const memberRole = normalizeUserRole(member.role) ?? member.role;
            const canManage = canManageMember(currentUserProfile, {
              role: memberRole,
            });

            return (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(member)}
                  disabled={!canManage}
                  className="dashboard-btn-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Bearbeiten
                </button>
                {member.id !== currentUserId && canManage && (
                  <>
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
                  </>
                )}
              </div>
            );
          },
        },
      ]}
    />
  );
}
