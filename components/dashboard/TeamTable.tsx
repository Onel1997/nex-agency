"use client";

import { formatDate } from "@/lib/dashboard/format";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/types";
import type { TeamMember } from "@/lib/dashboard/types";
import { DataTable } from "./DataTable";

interface TeamTableProps {
  members: TeamMember[];
  currentUserId: string;
  onRoleChange: (memberId: string, role: UserRole) => Promise<void>;
  onToggleActive: (memberId: string, isActive: boolean) => Promise<void>;
}

export function TeamTable({
  members,
  currentUserId,
  onRoleChange,
  onToggleActive,
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
          render: (member) => (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                member.is_active
                  ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25"
                  : "bg-red-500/15 text-red-300 ring-red-500/25"
              }`}
            >
              {member.is_active ? "Aktiv" : "Deaktiviert"}
            </span>
          ),
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
          className: "w-[140px]",
          render: (member) =>
            member.id === currentUserId ? (
              <span className="text-xs text-muted-soft">—</span>
            ) : (
              <button
                type="button"
                onClick={() => onToggleActive(member.id, !member.is_active)}
                className="dashboard-btn-secondary px-3 py-1.5 text-xs"
              >
                {member.is_active ? "Deaktivieren" : "Reaktivieren"}
              </button>
            ),
        },
      ]}
    />
  );
}
