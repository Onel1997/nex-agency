"use server";

import { revalidatePath } from "next/cache";
import type { ClientFormData } from "@/components/dashboard/ClientForm";
import {
  canAssignLeadOwner,
  canEditClientRevenue,
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
import { createClient } from "@/lib/supabase/server";

const CLIENT_FILES_BUCKET = "client-files";

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

  if (!canEditClientRevenue(profile, existing.responsible_member_id)) {
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

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("clients")
    .select("id, company_name, lead_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Kunde nicht gefunden");

  const { data: files, error: filesError } = await supabase
    .from("client_files")
    .select("storage_path")
    .eq("client_id", id);

  if (filesError && !filesError.message.toLowerCase().includes("client_files")) {
    throw new Error(filesError.message);
  }

  const storagePaths = (files ?? [])
    .map((file) => file.storage_path as string)
    .filter(Boolean);

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(CLIENT_FILES_BUCKET)
      .remove(storagePaths);

    if (storageError) throw new Error(storageError.message);
  }

  const { error: deleteError } = await supabase.from("clients").delete().eq("id", id);

  if (deleteError) throw new Error(deleteError.message);

  const linkedLeadId = existing.lead_id as string | null;
  if (linkedLeadId) {
    const { data: linkedLead, error: leadFetchError } = await supabase
      .from("leads")
      .select("company_name")
      .eq("id", linkedLeadId)
      .maybeSingle();

    if (leadFetchError) throw new Error(leadFetchError.message);

    const { error: leadDeleteError } = await supabase
      .from("leads")
      .delete()
      .eq("id", linkedLeadId);

    if (leadDeleteError) throw new Error(leadDeleteError.message);

    if (linkedLead) {
      await logActivity({
        actorId: profile.id,
        action: "lead_deleted",
        entityType: "lead",
        entityId: linkedLeadId,
        metadata: {
          company_name: linkedLead.company_name,
          deleted_with_client_id: id,
        },
        message: `${actorName(profile)} hat Lead ${linkedLead.company_name} gelöscht (zugehöriger Kunde entfernt)`,
      });
    }
  }

  await logActivity({
    actorId: profile.id,
    action: "client_deleted",
    entityType: "client",
    entityId: id,
    metadata: {
      company_name: existing.company_name,
      lead_id: linkedLeadId,
      lead_deleted: Boolean(linkedLeadId),
    },
    message: `${actorName(profile)} hat Kunde ${existing.company_name} endgültig gelöscht`,
  });

  revalidateClients();
}
