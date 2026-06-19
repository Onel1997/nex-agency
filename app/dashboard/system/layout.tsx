import { requireSystemAccess } from "@/lib/auth/session";

export default async function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSystemAccess();
  return <div className="space-y-6">{children}</div>;
}
