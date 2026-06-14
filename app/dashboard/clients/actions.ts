"use server";

import { revalidatePath } from "next/cache";
import type { ClientFormData } from "@/components/dashboard/ClientForm";
import {
  canAssignLeadOwner,
  canEditClientProfile,
  isManagement,
  isSuperAdmin,
} from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { logActivity } from "@/lib/dashboard/activity";
import { logClientActivity } from "@/lib/dashboard/client-activities";
import { parseEuroToCents } from "@/lib/dashboard/format";
import {
  CLIENT_ARCHIVE_MIGRATION_HINT,
  getClientById,
  isClientArchiveSchemaMissingError,
} from "@/lib/dashboard/clients";
import {
  buildClientSoftDeleteUpdate,
  CLIENT_SOFT_DELETE_MIGRATION_HINT,
  isClientSoftDeleteSchemaMissingError,
} from "@/lib/dashboard/client-soft-delete";
import { createClient } from "@/lib/supabase/server";

function revalidateClients(clientId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/finance");
  if (clientId) {
    revalidatePath(`/dashboard/clients/${clientId}`);
  }
}

function actorName(profile: { full_name: string | null; email: string }) {
  return profile.full_name?.trim() || profile.email.split("@")[0];
}

export async function updateClient(id: string, data: ClientFormData) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  const existing = await getClientById(id);
  if (!existing) throw new Error("Kunde nicht gefunden");

  if (!canEditClientProfile(profile, existing.responsible_member_id)) {
    throw new Error("Keine Berechtigung zur Bearbeitung dieses Kunden");
  }

  const responsibleMemberId = canAssignLeadOwner(profile)
    ? data.responsible_member_id || existing.responsible_member_id || profile.id
    : existing.responsible_member_id ?? profile.id;

  const payload = {
    responsible_member_id: responsibleMemberId,
    lead_estimated_value_cents: parseEuroToCents(data.lead_estimated_value),
    monthly_retainer_cents: parseEuroToCents(data.monthly_retainer),
    one_time_project_value_cents: parseEuroToCents(data.one_time_project_value),
    currency: "EUR",
  };

  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(payload).eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity({
    actorId: profile.id,
    action: "lead_updated",
    entityType: "client",
    entityId: id,
    metadata: {
      company_name: existing.company_name,
      responsible_member_id: responsibleMemberId,
    },
    message: `${actorName(profile)} hat Kunde ${existing.company_name} bearbeitet`,
  });

  await logClientActivity({
    clientId: id,
    actorId: profile.id,
    activityType: "contract_changed",
    description: `${actorName(profile)} hat Vertragsdaten von ${existing.company_name} geändert`,
    metadata: { responsible_member_id: responsibleMemberId },
  });

  revalidateClients(id);
}

export async function archiveClient(id: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  if (!isManagement(profile)) {
    throw new Error("Keine Berechtigung zum Archivieren von Kunden");
  }

  const existing = await getClientById(id);
  if (!existing) throw new Error("Kunde nicht gefunden");

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ is_archived: true })
    .eq("id", id);

  if (error) {
    if (isClientArchiveSchemaMissingError(error.message)) {
      throw new Error(CLIENT_ARCHIVE_MIGRATION_HINT);
    }
    throw new Error(error.message);
  }

  await logActivity({
    actorId: profile.id,
    action: "client_archived",
    entityType: "client",
    entityId: id,
    metadata: { company_name: existing.company_name },
    message: `${actorName(profile)} hat Kunde ${existing.company_name} archiviert`,
  });

  await logClientActivity({
    clientId: id,
    actorId: profile.id,
    activityType: "contract_changed",
    description: `${actorName(profile)} hat Kunde „${existing.company_name}" archiviert`,
    metadata: { archived: true },
  });

  revalidateClients(id);
}

export async function deleteClient(id: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("Nicht angemeldet");

  if (!isSuperAdmin(profile)) {
    throw new Error("Nur Super Admins dürfen Kunden endgültig löschen");
  }

  const existing = await getClientById(id);
  if (!existing) throw new Error("Kunde nicht gefunden");

  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("clients")
    .update(buildClientSoftDeleteUpdate())
    .eq("id", id)
    .is("deleted_at", null);

  if (deleteError) {
    if (isClientSoftDeleteSchemaMissingError(deleteError.message)) {
      throw new Error(CLIENT_SOFT_DELETE_MIGRATION_HINT);
    }
    throw new Error(deleteError.message);
  }

  await logActivity({
    actorId: profile.id,
    action: "client_deleted",
    entityType: "client",
    entityId: id,
    metadata: {
      company_name: existing.company_name,
      soft_deleted: true,
    },
    message: `${actorName(profile)} hat Kunde ${existing.company_name} gelöscht`,
  });

  revalidateClients();
}
