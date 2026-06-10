"use server";

import { revalidatePath } from "next/cache";
import type { ClientFormData } from "@/components/dashboard/ClientForm";
import {
  canAssignLeadOwner,
  canEditClientRevenue,
} from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { logActivity } from "@/lib/dashboard/activity";
import { parseEuroToCents } from "@/lib/dashboard/format";
import { getClientById } from "@/lib/dashboard/clients";
import { createClient } from "@/lib/supabase/server";

function revalidateClients() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/leads");
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
    contract_value_cents: parseEuroToCents(data.contract_value),
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

  revalidateClients();
}
