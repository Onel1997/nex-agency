"use server";

import { revalidatePath } from "next/cache";
import type { LeadFormData } from "@/components/dashboard/LeadForm";
import {
  canAssignLeadOwner,
  canConvertLeadToClient,
  canEditLeads,
  canMarkLeadWon,
  isCloser,
  isSetter,
} from "@/lib/auth/permissions";
import { agencyRoleFromLegacyRole, normalizeAgencyRole } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthUser, getProfile } from "@/lib/auth/session";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/dashboard/constants";
import { logActivity } from "@/lib/dashboard/activity";
import { logClientActivity } from "@/lib/dashboard/client-activities";
import { parseEuroToCents } from "@/lib/dashboard/format";
import {
  canClaimLead,
  canCloserWorkLead,
} from "@/lib/dashboard/lead-ownership";
import {
  assertRoleLeadStatusTransition,
  getVisibleLeadStatuses,
  isAllowedLeadStatusTransition,
  isScheduledHandoffStatus,
} from "@/lib/dashboard/lead-pipeline";
import {
  assertLeadStatusTransition,
  preserveLeadStatusForUpdate,
} from "@/lib/dashboard/lead-status-guard";
import { resolveSalesAttributionIds } from "@/lib/dashboard/sales-attribution";
import { createClient } from "@/lib/supabase/server";

function toDbPayload(
  data: LeadFormData,
  ownerId: string | null,
  estimatedValueCents: number | null,
) {
  return {
    company_name: data.company_name.trim(),
    contact_name: data.contact_name.trim() || null,
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
    website: data.website.trim() || null,
    status: data.status,
    acquired_by: data.acquired_by || null,
    notes: data.notes.trim() || null,
    owner_id: ownerId,
    estimated_value_cents: estimatedValueCents,
    currency: "EUR",
  };
}

function revalidateDashboard(clientId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/activities");
  if (clientId) {
    revalidatePath(`/dashboard/clients/${clientId}`);
  }
}

function actorName(profile: { full_name: string | null; email: string }) {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

async function resolveOwnerId(
  data: LeadFormData,
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>,
) {
  if (canAssignLeadOwner(profile)) {
    return data.owner_id || profile.id;
  }
  return profile.id;
}

async function resolveLeadSetterId(
  supabase: SupabaseClient,
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>,
  ownerId: string | null,
): Promise<string | null> {
  if (isSetter(profile)) return profile.id;
  if (!ownerId) return null;

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("agency_role, role")
    .eq("id", ownerId)
    .maybeSingle();

  if (!ownerProfile) return null;

  const ownerRole =
    normalizeAgencyRole(ownerProfile.agency_role) ??
    agencyRoleFromLegacyRole(ownerProfile.role as UserRole);

  return ownerRole === "setter" ? ownerId : null;
}

async function resolvePersistedLeadAttribution(
  supabase: SupabaseClient,
  input: {
    setterId: string | null;
    closerId: string | null;
    ownerId: string | null;
  },
): Promise<{ setterId: string | null; closerId: string | null }> {
  if (!input.closerId) {
    return { setterId: input.setterId, closerId: input.closerId };
  }

  const { data: closerProfile } = await supabase
    .from("profiles")
    .select("agency_role, role")
    .eq("id", input.closerId)
    .maybeSingle();

  const closerAgencyRole =
    normalizeAgencyRole(closerProfile?.agency_role) ??
    (closerProfile?.role === "super_admin" ? "owner" : null);

  return resolveSalesAttributionIds({
    setterId: input.setterId,
    closerId: input.closerId,
    leadOwnerId: input.ownerId,
    closerAgencyRole,
  });
}

export async function createLead(data: LeadFormData) {
  const user = await getAuthUser();
  const profile = await getProfile();
  if (!user || !profile) throw new Error("Nicht angemeldet");
  if (!canEditLeads(profile)) {
    throw new Error("Keine Berechtigung, Leads zu erstellen");
  }

  const ownerId = await resolveOwnerId(data, profile);
  const estimatedValueCents = parseEuroToCents(data.estimated_value);
  const supabase = await createClient();
  const setterId = await resolveLeadSetterId(supabase, profile, ownerId);

  const visibleStatuses = getVisibleLeadStatuses(profile);
  if (!visibleStatuses.includes(data.status)) {
    throw new Error("Dieser Status ist für deine Rolle nicht verfügbar");
  }
  if (
    !isAllowedLeadStatusTransition(profile, { status: "new", closer_id: null }, data.status) &&
    data.status !== "new"
  ) {
    throw new Error("Dieser Startstatus ist für deine Rolle nicht erlaubt");
  }

  const { data: created, error } = await supabase
    .from("leads")
    .insert({
      ...toDbPayload(data, ownerId, estimatedValueCents),
      created_by: profile.id,
      setter_id: setterId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logActivity({
    actorId: profile.id,
    action: "lead_created",
    entityType: "lead",
    entityId: created.id,
    metadata: { company_name: data.company_name.trim() },
    message: `${actorName(profile)} hat Lead ${data.company_name.trim()} erstellt`,
  });

  revalidateDashboard();
}

export async function updateLead(id: string, data: LeadFormData) {
  const user = await getAuthUser();
  const profile = await getProfile();
  if (!user || !profile) throw new Error("Nicht angemeldet");
  if (!canEditLeads(profile)) {
    throw new Error("Keine Berechtigung, Leads zu bearbeiten");
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("owner_id, company_name, status, closer_id")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const ownerId = canAssignLeadOwner(profile)
    ? data.owner_id || existing?.owner_id || profile.id
    : existing?.owner_id ?? profile.id;

  const previousOwnerId = existing?.owner_id ?? null;
  const estimatedValueCents = parseEuroToCents(data.estimated_value);
  const setterId = await resolveLeadSetterId(supabase, profile, ownerId);
  const existingStatus = existing.status as LeadStatus;
  const payload = toDbPayload(data, ownerId, estimatedValueCents);
  const leadFields = {
    status: existingStatus,
    closer_id: (existing.closer_id as string | null) ?? null,
  };
  const requestedStatus = preserveLeadStatusForUpdate(existingStatus, payload.status);
  let nextStatus = requestedStatus;
  try {
    assertRoleLeadStatusTransition(profile, leadFields, requestedStatus);
  } catch {
    nextStatus = existingStatus;
  }

  const { error } = await supabase
    .from("leads")
    .update({
      ...payload,
      status: nextStatus,
      setter_id: setterId,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity({
    actorId: profile.id,
    action: "lead_updated",
    entityType: "lead",
    entityId: id,
    metadata: { company_name: data.company_name.trim() },
    message: `${actorName(profile)} hat Lead ${data.company_name.trim()} bearbeitet`,
  });

  if (ownerId !== previousOwnerId) {
    await logActivity({
      actorId: profile.id,
      action: "lead_assigned",
      entityType: "lead",
      entityId: id,
      metadata: {
        company_name: data.company_name.trim(),
        owner_id: ownerId,
        previous_owner_id: previousOwnerId,
      },
      message: `${actorName(profile)} hat Lead ${data.company_name.trim()} neu zugewiesen`,
    });
  }

  revalidateDashboard();
}

export async function claimLead(id: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");
  if (!isCloser(profile)) {
    throw new Error("Nur Closer dürfen Leads übernehmen");
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("company_name, closer_id, status")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!canClaimLead(profile, existing)) {
    throw new Error("Lead ist nicht verfügbar oder bereits vergeben");
  }
  if (!isScheduledHandoffStatus(existing.status as LeadStatus)) {
    throw new Error("Nur terminierte Leads können übernommen werden");
  }

  const { data: claimed, error } = await supabase
    .from("leads")
    .update({ closer_id: profile.id })
    .eq("id", id)
    .is("closer_id", null)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!claimed) {
    throw new Error("Lead wurde gerade von einem anderen Closer übernommen");
  }

  await logActivity({
    actorId: profile.id,
    action: "lead_claimed",
    entityType: "lead",
    entityId: id,
    metadata: { company_name: existing.company_name },
    message: `${actorName(profile)} hat Lead ${existing.company_name} übernommen`,
  });

  revalidateDashboard();
}

export async function deleteLead(id: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("company_name")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity({
    actorId: profile.id,
    action: "lead_deleted",
    entityType: "lead",
    entityId: id,
    metadata: { company_name: existing.company_name },
    message: `${actorName(profile)} hat Lead ${existing.company_name} gelöscht`,
  });

  revalidateDashboard();
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");
  if (status === "won" && !canMarkLeadWon(profile)) {
    throw new Error("Keine Berechtigung, Leads als gewonnen zu markieren");
  }
  if (!canEditLeads(profile)) {
    throw new Error("Keine Berechtigung, Lead-Status zu ändern");
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("company_name, status, closer_id, setter_id, owner_id")
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const existingStatus = existing.status as LeadStatus;
  assertLeadStatusTransition(existingStatus, status);

  const leadFields = {
    status: existingStatus,
    closer_id: (existing.closer_id as string | null) ?? null,
  };
  assertRoleLeadStatusTransition(profile, leadFields, status);

  if (isCloser(profile)) {
    if (existing.closer_id && existing.closer_id !== profile.id) {
      throw new Error("Lead gehört einem anderen Closer");
    }
    if (status === "won" && !existing.closer_id) {
      throw new Error("Bitte Lead zuerst übernehmen, bevor er als gewonnen markiert wird");
    }
  }

  const updatePayload: Record<string, unknown> = { status };
  if (status === "won") {
    const closerId = isCloser(profile)
      ? profile.id
      : existing.closer_id ?? profile.id;
    updatePayload.closer_id = closerId;

    const resolved = await resolvePersistedLeadAttribution(supabase, {
      setterId: (existing.setter_id as string | null) ?? null,
      closerId,
      ownerId: (existing.owner_id as string | null) ?? null,
    });
    updatePayload.setter_id = resolved.setterId;
    if (resolved.closerId) {
      updatePayload.closer_id = resolved.closerId;
    }
  }

  const { error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (existing.status !== status) {
    await logActivity({
      actorId: profile.id,
      action: "lead_status_changed",
      entityType: "lead",
      entityId: id,
      metadata: {
        company_name: existing.company_name,
        from: existing.status,
        to: status,
      },
      message: `${actorName(profile)} hat Status von ${existing.company_name} auf ${LEAD_STATUS_LABELS[status]} geändert`,
    });

    if (status === "won") {
      const { data: linkedClient } = await supabase
        .from("clients")
        .select("id")
        .eq("lead_id", id)
        .maybeSingle();

      if (linkedClient) {
        await logClientActivity({
          clientId: linkedClient.id,
          actorId: profile.id,
          activityType: "lead_won",
          description: `Lead „${existing.company_name}" gewonnen`,
        });
      }
    }
  }

  revalidateDashboard();
}

export async function convertLeadToClient(leadId: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");
  if (!canConvertLeadToClient(profile)) {
    throw new Error("Keine Berechtigung, Leads in Kunden umzuwandeln");
  }

  const supabase = await createClient();
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select(
      "company_name, contact_name, phone, email, website, status, acquired_by, notes, owner_id, estimated_value_cents, currency, converted_to_client, setter_id, closer_id",
    )
    .eq("id", leadId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (lead.status !== "won") {
    throw new Error("Nur gewonnene Leads können in Kunden umgewandelt werden");
  }
  if (isCloser(profile) && !canCloserWorkLead(profile, lead)) {
    throw new Error("Lead gehört einem anderen Closer");
  }
  if (lead.converted_to_client) {
    throw new Error("Lead wurde bereits in einen Kunden umgewandelt");
  }

  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (existingClient) {
    const { error: flagError } = await supabase
      .from("leads")
      .update({ converted_to_client: true })
      .eq("id", leadId);

    if (flagError) throw new Error(flagError.message);
    revalidateDashboard();
    return;
  }

  const closerId =
    lead.closer_id ?? (isCloser(profile) ? profile.id : null);
  const resolvedAttribution = await resolvePersistedLeadAttribution(supabase, {
    setterId: (lead.setter_id as string | null) ?? null,
    closerId,
    ownerId: (lead.owner_id as string | null) ?? null,
  });

  const { data: client, error: insertError } = await supabase
    .from("clients")
    .insert({
      lead_id: leadId,
      company_name: lead.company_name,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      responsible_member_id: lead.owner_id,
      acquired_by: lead.acquired_by,
      notes: lead.notes,
      lead_estimated_value_cents: lead.estimated_value_cents,
      currency: lead.currency ?? "EUR",
      setter_id: resolvedAttribution.setterId,
      closer_id: resolvedAttribution.closerId,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      converted_to_client: true,
      setter_id: resolvedAttribution.setterId,
      closer_id: resolvedAttribution.closerId,
    })
    .eq("id", leadId);

  if (updateError) throw new Error(updateError.message);

  await logActivity({
    actorId: profile.id,
    action: "lead_converted",
    entityType: "client",
    entityId: client.id,
    metadata: {
      lead_id: leadId,
      company_name: lead.company_name,
    },
    message: `${actorName(profile)} hat Lead ${lead.company_name} in einen Kunden umgewandelt`,
  });

  await logClientActivity({
    clientId: client.id,
    actorId: profile.id,
    activityType: "client_created",
    description: `${actorName(profile)} hat Kunde „${lead.company_name}" erstellt`,
    metadata: { lead_id: leadId },
  });

  await logClientActivity({
    clientId: client.id,
    actorId: profile.id,
    activityType: "lead_won",
    description: `Lead „${lead.company_name}" gewonnen`,
    metadata: { lead_id: leadId },
  });

  revalidateDashboard(client.id);
}
