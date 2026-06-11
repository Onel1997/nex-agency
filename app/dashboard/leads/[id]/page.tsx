import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { LeadDetailClient } from "@/components/dashboard/LeadDetailClient";
import { LeadDetailConversion } from "@/components/dashboard/LeadDetailConversion";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { canAssignAppointments } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { getAppointmentsForLead } from "@/lib/dashboard/appointments";
import { formatCents, formatDate, formatWebsite } from "@/lib/dashboard/format";
import { getAssignableTeamMembers } from "@/lib/dashboard/team";
import { getLeadById, getLeads } from "@/lib/dashboard/leads";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) return null;

  const [lead, upcomingAppointments, leads, teamMembers] = await Promise.all([
    getLeadById(id),
    getAppointmentsForLead(id, true),
    getLeads(),
    getAssignableTeamMembers(),
  ]);

  if (!lead) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/leads"
        className="dashboard-link inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Leads
      </Link>

      <DashboardHeader
        title={lead.company_name}
        description="Lead-Details und anstehende Termine."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
            Lead-Informationen
          </h2>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Ansprechpartner" value={lead.contact_name || "—"} />
            <InfoItem label="E-Mail" value={lead.email || "—"} />
            <InfoItem label="Telefon" value={lead.phone || "—"} />
            <InfoItem label="Status">
              <StatusBadge status={lead.status} />
            </InfoItem>
            <InfoItem label="Betreuer" value={lead.owner_name || "—"} />
            <InfoItem label="Erstellt von" value={lead.creator_name || "—"} />
            <InfoItem
              label="Geschätzter Wert"
              value={formatCents(lead.estimated_value_cents)}
            />
            <InfoItem label="Akquiriert von" value={lead.acquired_by || "—"} />
            <InfoItem label="Erstellt am" value={formatDate(lead.created_at)} />
            <InfoItem label="Website">
              {lead.website ? (
                <a
                  href={
                    lead.website.startsWith("http")
                      ? lead.website
                      : `https://${lead.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dashboard-link inline-flex items-center gap-1"
                >
                  {formatWebsite(lead.website)}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              ) : (
                "—"
              )}
            </InfoItem>
          </dl>

          {lead.notes && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-soft">
                Notizen
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {lead.notes}
              </p>
            </div>
          )}

          <LeadDetailConversion lead={lead} />
        </div>

        <LeadDetailClient
          leadId={lead.id}
          upcomingAppointments={upcomingAppointments}
          leads={leads}
          teamMembers={teamMembers}
          canAssign={canAssignAppointments(profile)}
          currentUserId={profile.id}
        />
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-soft">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children ?? value}</dd>
    </div>
  );
}
