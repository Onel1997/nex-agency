"use client";

import { useRouter } from "next/navigation";
import { convertLeadToClient } from "@/app/dashboard/leads/actions";
import { LeadConversionAction } from "./LeadConversionAction";
import type { Lead } from "@/lib/dashboard/types";

interface LeadDetailConversionProps {
  lead: Lead;
}

export function LeadDetailConversion({ lead }: LeadDetailConversionProps) {
  const router = useRouter();

  const handleConvert = async (leadId: string) => {
    await convertLeadToClient(leadId);
    router.refresh();
  };

  if (lead.status !== "won" && !lead.converted_to_client) return null;

  return (
    <div className="mt-5 border-t border-border pt-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-soft">
        Kundenkonvertierung
      </p>
      <div className="mt-3">
        <LeadConversionAction lead={lead} onConvert={handleConvert} />
      </div>
    </div>
  );
}
