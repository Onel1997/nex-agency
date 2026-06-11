"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  assertRoleAssignable,
  canAssignRoleToMember,
  canManageMember,
} from "@/lib/auth/permissions";
import { normalizeUserRole } from "@/lib/auth/roles";
import type { Profile, UserRole } from "@/lib/auth/types";
import { ROLE_LABELS } from "@/lib/auth/types";
import { SET_PASSWORD_PATH } from "@/lib/auth/password-setup";
import { requireManagement } from "@/lib/auth/session";
import { logActivity } from "@/lib/dashboard/activity";
import { createAdminClient } from "@/lib/supabase/admin";

function revalidateTeam() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/activities");
  revalidatePath("/dashboard/leads");
}

async function getSiteOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${protocol}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function parseRole(role: string): UserRole {
  const normalized = normalizeUserRole(role);
  if (!normalized) throw new Error("Ungültige Rolle");
  return normalized;
}

function assertMemberManageable(
  actor: Profile,
  member: { role: string },
  nextRole?: UserRole,
) {
  if (!canManageMember(actor, member)) {
    throw new Error(
      "Keine Berechtigung: Super Admins können nur von Super Admins verwaltet werden",
    );
  }
  if (nextRole && !canAssignRoleToMember(actor, member, nextRole)) {
    throw new Error("Keine Berechtigung, diese Rolle zu vergeben");
  }
}

async function fetchMemberProfile(memberId: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .select("email, full_name, role, status, commission_rate, activated_at")
    .eq("id", memberId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function inviteTeamMember(formData: FormData) {
  const admin = await requireManagement();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = parseRole(String(formData.get("role") ?? "employee"));

  if (!email) throw new Error("E-Mail ist erforderlich");
  assertRoleAssignable(role, admin);

  const origin = await getSiteOrigin();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(SET_PASSWORD_PATH)}`,
    data: {
      full_name: email.split("@")[0],
    },
  });

  if (error) throw new Error(error.message);

  const userId = data.user?.id;
  if (userId) {
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        role,
        full_name: email.split("@")[0],
        status: "pending",
        is_active: false,
        activated_at: null,
      })
      .eq("id", userId);

    if (profileError) throw new Error(profileError.message);
  }

  const displayName = email.split("@")[0];
  await logActivity({
    actorId: admin.id,
    action: "member_invited",
    entityType: "team",
    entityId: userId ?? null,
    metadata: { email, role },
    message: `${formatActorName(admin)} hat ${displayName} als ${ROLE_LABELS[role]} eingeladen`,
  });

  revalidateTeam();
}

export interface UpdateTeamMemberInput {
  full_name: string;
  role: UserRole;
  commission_rate: number;
}

export async function updateTeamMember(
  memberId: string,
  input: UpdateTeamMemberInput,
) {
  const admin = await requireManagement();
  const full_name = input.full_name.trim();
  const role = parseRole(input.role);
  const commission_rate = input.commission_rate;

  if (!full_name) throw new Error("Name ist erforderlich");

  if (commission_rate < 0 || commission_rate > 100) {
    throw new Error("Provisionssatz muss zwischen 0 und 100 liegen");
  }

  if (memberId === admin.id && role !== admin.role) {
    throw new Error("Sie können Ihre eigene Rolle nicht ändern");
  }

  const member = await fetchMemberProfile(memberId);
  assertMemberManageable(admin, member, role);

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({ full_name, role, commission_rate })
    .eq("id", memberId);

  if (error) throw new Error(error.message);

  const memberName = full_name || member.email.split("@")[0];
  await logActivity({
    actorId: admin.id,
    action: "member_updated",
    entityType: "profile",
    entityId: memberId,
    metadata: {
      email: member.email,
      full_name,
      role,
      commission_rate,
      previous_role: member.role,
      previous_commission_rate: member.commission_rate,
    },
    message: `${formatActorName(admin)} hat ${memberName} aktualisiert`,
  });

  revalidateTeam();
}

export async function updateMemberRole(memberId: string, roleInput: UserRole) {
  const admin = await requireManagement();
  const role = parseRole(roleInput);

  if (memberId === admin.id) {
    throw new Error("Sie können Ihre eigene Rolle nicht ändern");
  }

  const member = await fetchMemberProfile(memberId);
  assertMemberManageable(admin, member, role);

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({ role })
    .eq("id", memberId);

  if (error) throw new Error(error.message);

  const memberName = member.full_name?.trim() || member.email.split("@")[0];
  await logActivity({
    actorId: admin.id,
    action: "role_changed",
    entityType: "profile",
    entityId: memberId,
    metadata: { from: member.role, to: role, email: member.email },
    message: `${formatActorName(admin)} hat die Rolle von ${memberName} auf ${ROLE_LABELS[role]} geändert`,
  });

  revalidateTeam();
}

export async function setMemberActive(memberId: string, isActive: boolean) {
  const admin = await requireManagement();
  if (memberId === admin.id) {
    throw new Error("Sie können Ihr eigenes Konto nicht deaktivieren");
  }

  const member = await fetchMemberProfile(memberId);
  assertMemberManageable(admin, member);

  if (isActive && !member.activated_at) {
    throw new Error(
      "Ausstehende Einladungen werden erst nach Annahme automatisch aktiviert",
    );
  }

  const nextStatus = isActive ? "active" : "deactivated";

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({ status: nextStatus, is_active: isActive })
    .eq("id", memberId);

  if (error) throw new Error(error.message);

  const memberName = member.full_name?.trim() || member.email.split("@")[0];
  await logActivity({
    actorId: admin.id,
    action: isActive ? "member_reactivated" : "member_deactivated",
    entityType: "profile",
    entityId: memberId,
    metadata: { email: member.email, status: nextStatus },
    message: isActive
      ? `${formatActorName(admin)} hat ${memberName} reaktiviert`
      : `${formatActorName(admin)} hat ${memberName} deaktiviert`,
  });

  revalidateTeam();
}

export async function deleteMember(memberId: string) {
  const admin = await requireManagement();
  if (memberId === admin.id) {
    throw new Error("Sie können Ihr eigenes Konto nicht löschen");
  }

  const member = await fetchMemberProfile(memberId);
  assertMemberManageable(admin, member);

  const memberName = member.full_name?.trim() || member.email.split("@")[0];

  await logActivity({
    actorId: admin.id,
    action: "member_deleted",
    entityType: "profile",
    entityId: memberId,
    metadata: { email: member.email, status: member.status },
    message: `${formatActorName(admin)} hat ${memberName} gelöscht`,
  });

  const adminClient = createAdminClient();
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(memberId);

  if (deleteError) throw new Error(deleteError.message);

  revalidateTeam();
}

function formatActorName(profile: {
  full_name: string | null;
  email: string;
}) {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}
