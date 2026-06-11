"use client";

import { formatCents } from "@/lib/dashboard/format";
import type { ClientRecord, Lead } from "@/lib/dashboard/types";

interface DashboardOverviewProps {
  recentLeads: Lead[];
  recentClients: ClientRecord[];
  showOwnership: boolean;
}

export function DashboardOverview({
  recentLeads,
  recentClients,
  showOwnership,
}: DashboardOverviewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <OverviewCard title="Aktuelle Leads">
        {recentLeads.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Leads vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-soft">
                  <th className="py-2 pr-3 font-medium">Firma</th>
                  {showOwnership && (
                    <>
                      <th className="py-2 pr-3 font-medium">Eigentümer</th>
                      <th className="py-2 pr-3 font-medium">Erstellt von</th>
                    </>
                  )}
                  <th className="py-2 font-medium text-right">Wert</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      {lead.company_name}
                    </td>
                    {showOwnership && (
                      <>
                        <td className="py-2.5 pr-3 text-muted">
                          {lead.owner_name || "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-muted">
                          {lead.creator_name || "—"}
                        </td>
                      </>
                    )}
                    <td className="py-2.5 text-right tabular-nums text-foreground">
                      {formatCents(lead.estimated_value_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OverviewCard>

      <OverviewCard title="Aktuelle Kunden">
        {recentClients.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Kunden vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-soft">
                  <th className="py-2 pr-3 font-medium">Firma</th>
                  <th className="py-2 pr-3 font-medium">Verantwortlich</th>
                  <th className="py-2 font-medium text-right">Lead-Schätzung</th>
                </tr>
              </thead>
              <tbody>
                {recentClients.map((client) => (
                  <tr key={client.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      {client.company_name}
                    </td>
                    <td className="py-2.5 pr-3 text-muted">
                      {client.responsible_member_name || "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-foreground">
                      {formatCents(client.lead_estimated_value_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OverviewCard>
    </div>
  );
}

function OverviewCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-soft">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
