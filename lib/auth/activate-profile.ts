import { createClient } from "@/lib/supabase/server";

export async function activateProfile(userId: string) {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ status: "active", is_active: true })
    .eq("id", userId)
    .eq("status", "pending");
}
