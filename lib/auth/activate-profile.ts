import { createClient } from "@/lib/supabase/server";

export async function activateProfile(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) return;

  await supabase.rpc("activate_pending_profile");
}
