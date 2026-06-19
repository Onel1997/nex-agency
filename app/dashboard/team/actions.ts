"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  assertAgencyRoleAssignable,
  canAssignAgencyRoleToMember,
  canManageMember,
} from "@/lib/auth/permissions";
import {
  normalizeAgencyRole,
  normalizeEmploymentType,
} from "@/lib/auth/roles";
import type { AgencyRole, EmploymentType, Profile } from "@/lib/auth/types";
import {
  AGENCY_ROLE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
} from "@/lib/auth/types";
import { SET_PASSWORD_PATH } from "@/lib/auth/password-setup";
import { requireManagement } from "@/lib/auth/session";
import { logActivity } from "@/lib/dashboard/activity";
import {
  updateEmployeeMasterData,
  updateFreelancerMasterData,
} from "@/lib/dashboard/team-master-data";
import { createAdminClient } from "@/lib/supabase/admin";

function revalidateTeam() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/activities");
  revalidatePath("/dashboard/leads");
}

function revalidateTeamMember(memberId: string) {
  revalidateTeam();
  revalidatePath(`/dashboard/team/${memberId}`);
}

function readOptionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

async function getSiteOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${protocol}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function parseAgencyRole(role: string): AgencyRole {
  const normalized = normalizeAgencyRole(role);
  if (!normalized) throw new Error("Ungültige Agenturrolle");
  return normalized;
}

function parseEmploymentType(value: string): EmploymentType {
  const normalized = normalizeEmploymentType(value);
  if (!normalized) throw new Error("Ungültige Beschäftigungsart");
  return normalized;
}

function assertMemberManageable(
  actor: Profile,
  member: { agency_role?: string | null; role?: string },
  nextRole?: AgencyRole,
) {
  if (!canManageMember(actor, member)) {
    throw new Error(
      "Keine Berechtigung: Owner können nur von Ownern verwaltet werden",
    );
  }
  if (nextRole && !canAssignAgencyRoleToMember(actor, member, nextRole)) {
    throw new Error("Keine Berechtigung, diese Rolle zu vergeben");
  }
}

async function fetchMemberProfile(memberId: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .select(
      "email, full_name, role, agency_role, employment_type, status, commission_rate, setter_commission_rate, closer_commission_rate, retainer_commission_rate, retainer_commission_months, activated_at",
    )
    .eq("id", memberId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function inviteTeamMember(formData: FormData) {
  const admin = await requireManagement();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const agencyRole = parseAgencyRole(String(formData.get("agency_role") ?? "setter"));
  const employmentType = parseEmploymentType(
    String(formData.get("employment_type") ?? "employee"),
  );

  if (!email) throw new Error("E-Mail ist erforderlich");
  assertAgencyRoleAssignable(agencyRole, admin);

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
        agency_role: agencyRole,
        employment_type: employmentType,
        full_name: email.split("@")[0],
        status: "pending",
        is_active: false,
        activated_at: null,
        setter_commission_rate: 0,
        closer_commission_rate: 0,
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
    metadata: { email, agency_role: agencyRole, employment_type: employmentType },
    message: `${formatActorName(admin)} hat ${displayName} als ${AGENCY_ROLE_LABELS[agencyRole]} eingeladen`,
  });

  revalidateTeam();
}

export interface UpdateTeamMemberInput {
  full_name: string;
  employment_type: EmploymentType;
  agency_role: AgencyRole;
  setter_commission_rate: number;
  closer_commission_rate: number;
  retainer_commission_rate: number;
  retainer_commission_months: number;
}

export async function updateTeamMember(
  memberId: string,
  input: UpdateTeamMemberInput,
) {
  const admin = await requireManagement();
  const full_name = input.full_name.trim();
  const agencyRole = parseAgencyRole(input.agency_role);
  const employmentType = parseEmploymentType(input.employment_type);
  const setterCommissionRate = input.setter_commission_rate;
  const closerCommissionRate = input.closer_commission_rate;
  const retainerCommissionRate = input.retainer_commission_rate;
  const retainerCommissionMonths = input.retainer_commission_months;

  if (!full_name) throw new Error("Name ist erforderlich");

  for (const [label, rate] of [
    ["Setter", setterCommissionRate],
    ["Closer", closerCommissionRate],
    ["Retainer", retainerCommissionRate],
  ] as const) {
    if (rate < 0 || rate > 100) {
      throw new Error(`${label}-Provisionssatz muss zwischen 0 und 100 liegen`);
    }
  }

  if (
    !Number.isFinite(retainerCommissionMonths) ||
    retainerCommissionMonths < 0 ||
    retainerCommissionMonths > 120
  ) {
    throw new Error("Retainer-Provisionsdauer muss zwischen 0 und 120 Monaten liegen");
  }

  if (memberId === admin.id && agencyRole !== admin.agency_role) {
    throw new Error("Sie können Ihre eigene Rolle nicht ändern");
  }

  const member = await fetchMemberProfile(memberId);
  assertMemberManageable(admin, member, agencyRole);

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({
      full_name,
      agency_role: agencyRole,
      employment_type: employmentType,
      setter_commission_rate: setterCommissionRate,
      closer_commission_rate: closerCommissionRate,
      retainer_commission_rate: retainerCommissionRate,
      retainer_commission_months: retainerCommissionMonths,
    })
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
      agency_role: agencyRole,
      employment_type: employmentType,
      setter_commission_rate: setterCommissionRate,
      closer_commission_rate: closerCommissionRate,
      retainer_commission_rate: retainerCommissionRate,
      retainer_commission_months: retainerCommissionMonths,
      previous_agency_role: member.agency_role,
      previous_employment_type: member.employment_type,
    },
    message: `${formatActorName(admin)} hat ${memberName} aktualisiert`,
  });

  revalidateTeam();
}

export async function updateMemberAgencyRole(
  memberId: string,
  roleInput: AgencyRole,
) {
  const admin = await requireManagement();
  const agencyRole = parseAgencyRole(roleInput);

  if (memberId === admin.id) {
    throw new Error("Sie können Ihre eigene Rolle nicht ändern");
  }

  const member = await fetchMemberProfile(memberId);
  assertMemberManageable(admin, member, agencyRole);

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({ agency_role: agencyRole })
    .eq("id", memberId);

  if (error) throw new Error(error.message);

  const memberName = member.full_name?.trim() || member.email.split("@")[0];
  await logActivity({
    actorId: admin.id,
    action: "role_changed",
    entityType: "profile",
    entityId: memberId,
    metadata: {
      from: member.agency_role,
      to: agencyRole,
      email: member.email,
    },
    message: `${formatActorName(admin)} hat die Rolle von ${memberName} auf ${AGENCY_ROLE_LABELS[agencyRole]} geändert`,
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

export async function updateTeamMemberMasterData(
  memberId: string,
  formData: FormData,
) {
  const admin = await requireManagement();
  const member = await fetchMemberProfile(memberId);
  assertMemberManageable(admin, member);

  const employmentType = parseEmploymentType(
    String(member.employment_type ?? "employee"),
  );

  if (employmentType === "freelancer") {
    await updateFreelancerMasterData(memberId, {
      phone: readOptionalString(formData, "phone"),
      street: readOptionalString(formData, "street"),
      house_number: readOptionalString(formData, "house_number"),
      postal_code: readOptionalString(formData, "postal_code"),
      city: readOptionalString(formData, "city"),
      country: readOptionalString(formData, "country"),
      iban: readOptionalString(formData, "iban"),
      bic: readOptionalString(formData, "bic"),
      bank_name: readOptionalString(formData, "bank_name"),
      business_name: readOptionalString(formData, "business_name"),
      tax_number: readOptionalString(formData, "tax_number"),
      vat_id: readOptionalString(formData, "vat_id"),
    });
  } else {
    await updateEmployeeMasterData(memberId, {
      phone: readOptionalString(formData, "phone"),
      street: readOptionalString(formData, "street"),
      house_number: readOptionalString(formData, "house_number"),
      postal_code: readOptionalString(formData, "postal_code"),
      city: readOptionalString(formData, "city"),
      country: readOptionalString(formData, "country"),
      iban: readOptionalString(formData, "iban"),
      bic: readOptionalString(formData, "bic"),
      bank_name: readOptionalString(formData, "bank_name"),
      tax_id: readOptionalString(formData, "tax_id"),
      social_security_number: readOptionalString(formData, "social_security_number"),
      health_insurance: readOptionalString(formData, "health_insurance"),
      employee_number: readOptionalString(formData, "employee_number"),
      birth_date: readOptionalString(formData, "birth_date"),
    });
  }

  const memberName = member.full_name?.trim() || member.email.split("@")[0];
  await logActivity({
    actorId: admin.id,
    action: "member_master_data_updated",
    entityType: "profile",
    entityId: memberId,
    metadata: { email: member.email, employment_type: employmentType },
    message: `${formatActorName(admin)} hat Stammdaten von ${memberName} aktualisiert`,
  });

  revalidateTeamMember(memberId);
}

function formatActorName(profile: {
  full_name: string | null;
  email: string;
}) {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}
