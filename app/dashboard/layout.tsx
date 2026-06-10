import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "NexAgency CRM",
  description: "Internes Dashboard für Leads, Termine und Kunden.",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
