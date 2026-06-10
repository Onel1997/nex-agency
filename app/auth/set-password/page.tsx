import { redirect } from "next/navigation";
import { SET_PASSWORD_PATH } from "@/lib/auth/password-setup";

export default function LegacySetPasswordPage() {
  redirect(SET_PASSWORD_PATH);
}
