"use client";

import { useRouter } from "next/navigation";
import { convertLeadToClient, updateLeadStatus } from "@/app/dashboard/leads/actions";
import { LeadConversionAction } from "./LeadConversionAction";
import { LeadMarkWonAction } from "./LeadMarkWonAction";
import type { Lead } from "@/lib/dashboard/types";

interface LeadDetailConversionProps {
  lead: Lead;
  canMarkLeadWon: boolean;
  canConvertLead: boolean;
}

export function LeadDetailConversion({
  lead,
  canMarkLeadWon,
  canConvertLead,
}: LeadDetailConversionProps) {
  const router = useRouter();

  const handleMarkWon = async (leadId: string) => {
    await updateLeadStatus(leadId, "won");
    router.refresh();
  };

  const handleConvert = async (leadId: string) => {
    await convertLeadToClient(leadId);
    router.refresh();
  };

  if (
    !canMarkLeadWon &&
    !canConvertLead &&
    lead.status !== "won" &&
    !lead.converted_to_client
  ) {
    return null;
  }

  return (
    <div className="mt-5 border-t border-border pt-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-soft">
        Abschluss
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <LeadMarkWonAction
          lead={lead}
          canMarkWon={canMarkLeadWon}
          onMarkWon={handleMarkWon}
        />
        {canConvertLead ? (
          <LeadConversionAction lead={lead} onConvert={handleConvert} />
        ) : null}
      </div>
    </div>
  );
}
