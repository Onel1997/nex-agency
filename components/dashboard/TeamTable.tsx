"use client";

import { useRouter } from "next/navigation";
import { formatDate, formatPercent } from "@/lib/dashboard/format";
import {
  canManageMember,
  getAssignableAgencyRoles,
  type PermissionActor,
} from "@/lib/auth/permissions";
import {
  agencyRoleSelectOptions,
  getAgencyRoleLabel,
  getEmploymentTypeLabel,
} from "@/lib/auth/roles";
import type { AgencyRole } from "@/lib/auth/types";
import type { TeamMember } from "@/lib/dashboard/types";
import { DataTable } from "./DataTable";
import { TeamMemberStatusBadge } from "./TeamMemberStatusBadge";

interface TeamTableProps {
  members: TeamMember[];
  currentUserId: string;
  currentUserProfile: PermissionActor;
  onEdit: (member: TeamMember) => void;
  onRoleChange: (memberId: string, role: AgencyRole) => Promise<void>;
  onToggleActive: (memberId: string, isActive: boolean) => Promise<void>;
  onDelete: (memberId: string) => Promise<void>;
}

export function TeamTable({
  members,
  currentUserId,
  currentUserProfile,
  onEdit,
  onRoleChange,
  onToggleActive,
  onDelete,
}: TeamTableProps) {
  const router = useRouter();
  const assignableRoles = getAssignableAgencyRoles(currentUserProfile);

  return (
    <DataTable
      data={members}
      rowKey={(member) => member.id}
      onRowClick={(member) => router.push(`/dashboard/team/${member.id}`)}
      getRowAriaLabel={(member) =>
        `Teammitglied ${member.full_name?.trim() || member.email} öffnen`
      }
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
          key: "employment",
          header: "Beschäftigungsart",
          hideOnMobile: true,
          render: (member) => (
            <span className="text-muted">
              {getEmploymentTypeLabel(member.employment_type)}
            </span>
          ),
        },
        {
          key: "role",
          header: "Agenturrolle",
          render: (member) => {
            const canEditRole =
              member.id !== currentUserId &&
              canManageMember(currentUserProfile, {
                agency_role: member.agency_role,
                role: member.role,
              });

            if (!canEditRole) {
              return (
                <span className="text-muted">
                  {getAgencyRoleLabel(member.agency_role)}
                </span>
              );
            }

            const options = agencyRoleSelectOptions(
              assignableRoles,
              member.agency_role,
            );

            return (
              <select
                value={member.agency_role}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  onRoleChange(member.id, e.target.value as AgencyRole)
                }
                className="dashboard-select-sm"
                aria-label={`Agenturrolle für ${member.email}`}
              >
                {options.map((role) => (
                  <option key={role} value={role}>
                    {getAgencyRoleLabel(role)}
                  </option>
                ))}
              </select>
            );
          },
        },
        {
          key: "setter_commission",
          header: "Setter %",
          className: "text-right",
          hideOnMobile: true,
          render: (member) => (
            <span className="tabular-nums text-foreground">
              {formatPercent(member.setter_commission_rate)}
            </span>
          ),
        },
        {
          key: "closer_commission",
          header: "Closer %",
          className: "text-right",
          hideOnMobile: true,
          render: (member) => (
            <span className="tabular-nums text-foreground">
              {formatPercent(member.closer_commission_rate)}
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
            const canManage = canManageMember(currentUserProfile, {
              agency_role: member.agency_role,
              role: member.role,
            });

            return (
              <div
                className="flex flex-wrap gap-2"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
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
