import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { ClientDetailPageClient } from "@/components/dashboard/ClientDetailPageClient";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  canAccessClient,
  canAssignClientOwner,
  canEditClientProfile,
  canEditClientRevenue,
} from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { getClientActivities } from "@/lib/dashboard/client-activities";
import { getClientCommunications } from "@/lib/dashboard/client-communications";
import { getClientFiles } from "@/lib/dashboard/client-files";
import { getClientNotes } from "@/lib/dashboard/client-notes";
import { getClientDetailById } from "@/lib/dashboard/clients";
import { getClientRevenueRecordById } from "@/lib/dashboard/finance";
import { getSetterAttributionDiagnosis } from "@/lib/dashboard/setter-attribution-diagnosis";
import { getInvoicesForClient } from "@/lib/dashboard/invoices";
import { getAssignableTeamMembers } from "@/lib/dashboard/team";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) return null;

  const client = await getClientDetailById(id);
  if (!client) notFound();

  if (!canAccessClient(profile, client.responsible_member_id, {
    setterId: client.setter_id,
    closerId: client.closer_id,
  })) {
    notFound();
  }

  const [notes, activities, communications, files, revenue, invoices, teamMembers, setterAttributionDiagnosis] =
    await Promise.all([
      getClientNotes(id),
      getClientActivities(id),
      getClientCommunications(id),
      getClientFiles(id),
      getClientRevenueRecordById(id),
      getInvoicesForClient(id),
      getAssignableTeamMembers(),
      getSetterAttributionDiagnosis(id),
    ]);

  console.log("[SalesAttributionPanel props]", {
    role: profile.agency_role ?? profile.role,
    setterName: revenue?.setter_name,
    closerName: revenue?.closer_name,
    revenue,
  });

  if (setterAttributionDiagnosis) {
    console.log(
      "[SetterAttributionDiagnosis]",
      JSON.stringify(setterAttributionDiagnosis, null, 2),
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/clients"
        className="dashboard-link inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Kunden
      </Link>

      <DashboardHeader
        title={client.company_name}
        description="Kundenakte — Übersicht, Notizen, Aktivitäten und Verträge."
      />

      <Suspense fallback={<div className="glass-card rounded-2xl p-6 text-sm text-muted">Laden…</div>}>
        <ClientDetailPageClient
          client={client}
          notes={notes}
          activities={activities}
          communications={communications}
          files={files}
          revenue={revenue}
          invoices={invoices}
          profile={profile}
          canEditContracts={canEditClientRevenue(profile, client.responsible_member_id, {
            closerId: client.closer_id,
          })}
          canEditOverview={canEditClientProfile(profile, client.responsible_member_id)}
          canAssign={canAssignClientOwner(profile)}
          teamMembers={teamMembers}
          setterAttributionDiagnosis={setterAttributionDiagnosis}
        />
      </Suspense>
    </div>
  );
}
