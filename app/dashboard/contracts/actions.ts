"use server";

import { revalidatePath } from "next/cache";
import { requireContractsAccess } from "@/lib/auth/session";
import {
  generateAndStoreContractPdf,
  parseContractFormData,
  validateContractInput,
} from "@/lib/dashboard/contracts";
import { createClient } from "@/lib/supabase/server";

function revalidateContracts(profileId?: string) {
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/team");
  if (profileId) {
    revalidatePath(`/dashboard/team/${profileId}`);
  }
}

export async function createContract(formData: FormData) {
  await requireContractsAccess();

  const input = parseContractFormData(formData);
  const validationError = validateContractInput(input);
  if (validationError) throw new Error(validationError);

  const supabase = await createClient();
  const { data: contractNumber, error: numberError } = await supabase.rpc(
    "next_contract_number",
  );

  if (numberError) throw new Error(numberError.message);

  const { data: contract, error: insertError } = await supabase
    .from("contracts")
    .insert({
      profile_id: input.profileId,
      contract_type: input.contractType,
      status: input.status,
      title: input.title,
      contract_number: contractNumber as string,
      start_date: input.startDate,
      end_date: input.endDate,
      monthly_salary_cents: input.monthlySalaryCents,
      commission_rate: input.commissionRate,
      notes: input.notes,
      signed_at: input.status === "active" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  await generateAndStoreContractPdf(contract.id as string);
  revalidateContracts(input.profileId);
}

export async function updateContract(contractId: string, formData: FormData) {
  await requireContractsAccess();

  const input = parseContractFormData(formData);
  const validationError = validateContractInput(input);
  if (validationError) throw new Error(validationError);

  const supabase = await createClient();
  const { error } = await supabase
    .from("contracts")
    .update({
      profile_id: input.profileId,
      contract_type: input.contractType,
      status: input.status,
      title: input.title,
      start_date: input.startDate,
      end_date: input.endDate,
      monthly_salary_cents: input.monthlySalaryCents,
      commission_rate: input.commissionRate,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId);

  if (error) throw new Error(error.message);

  await generateAndStoreContractPdf(contractId);
  revalidateContracts(input.profileId);
}

export async function deleteContract(contractId: string) {
  await requireContractsAccess();

  const supabase = await createClient();
  const { data: contract, error: fetchError } = await supabase
    .from("contracts")
    .select("profile_id, pdf_url, contract_number")
    .eq("id", contractId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  if (contract.pdf_url && !String(contract.pdf_url).startsWith("/api/")) {
    await supabase.storage.from("contract-pdfs").remove([contract.pdf_url as string]);
  }

  const { error } = await supabase.from("contracts").delete().eq("id", contractId);
  if (error) throw new Error(error.message);

  revalidateContracts(contract.profile_id as string);
}

export async function regenerateContractPdf(contractId: string) {
  await requireContractsAccess();
  const pdfUrl = await generateAndStoreContractPdf(contractId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("contracts")
    .select("profile_id")
    .eq("id", contractId)
    .single();

  revalidateContracts(data?.profile_id as string | undefined);
  return pdfUrl;
}
