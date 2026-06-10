"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  canAssignSuperAdminRole,
  isValidUserRole,
} from "@/lib/auth/permissions";
import type { Profile, UserRole } from "@/lib/auth/types";
import { ROLE_LABELS } from "@/lib/auth/types";
import { requireManagement } from "@/lib/auth/session";
import { logActivity } from "@/lib/dashboard/activity";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

function assertRoleAllowed(role: UserRole, actor: Profile) {
  if (!isValidUserRole(role)) {
    throw new Error("Ungültige Rolle");
  }
  if (role === "super_admin" && !canAssignSuperAdminRole(actor)) {
    throw new Error("Nur Super Admins können die Super-Admin-Rolle vergeben");
  }
}

export async function inviteTeamMember(formData: FormData) {
  const admin = await requireManagement();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "employee") as UserRole;

  if (!email) throw new Error("E-Mail ist erforderlich");
  assertRoleAllowed(role, admin);

  const origin = await getSiteOrigin();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/dashboard`,
    data: {
      full_name: email.split("@")[0],
    },
  });

  if (error) throw new Error(error.message);

  const userId = data.user?.id;
  if (userId) {
    await adminClient
      .from("profiles")
      .update({
        role,
        full_name: email.split("@")[0],
        status: "pending",
        is_active: false,
        activated_at: null,
      })
      .eq("id", userId);
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

export async function updateMemberRole(memberId: string, role: UserRole) {
  const admin = await requireManagement();
  assertRoleAllowed(role, admin);

  const supabase = await createClient();
  const { data: member, error: fetchError } = await supabase
    .from("profiles")
    .select("email, full_name, role, status")
    .eq("id", memberId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  if (
    member.role === "super_admin" &&
    role !== "super_admin" &&
    !canAssignSuperAdminRole(admin)
  ) {
    throw new Error("Keine Berechtigung zum Ändern der Super-Admin-Rolle");
  }

  const { error } = await supabase
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

  const supabase = await createClient();
  const { data: member, error: fetchError } = await supabase
    .from("profiles")
    .select("email, full_name, status, activated_at")
    .eq("id", memberId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  if (isActive && !member.activated_at) {
    throw new Error(
      "Ausstehende Einladungen werden erst nach Annahme automatisch aktiviert",
    );
  }

  const nextStatus = isActive ? "active" : "deactivated";

  const { error } = await supabase
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

  const supabase = await createClient();
  const { data: member, error: fetchError } = await supabase
    .from("profiles")
    .select("email, full_name, status")
    .eq("id", memberId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

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
