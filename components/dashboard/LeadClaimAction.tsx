"use client";

import { Handshake } from "lucide-react";
import type { Lead } from "@/lib/dashboard/types";

interface LeadClaimActionProps {
  lead: Lead;
  canClaim: boolean;
  onClaim: (leadId: string) => Promise<void>;
}

export function LeadClaimAction({
  lead,
  canClaim,
  onClaim,
}: LeadClaimActionProps) {
  if (!canClaim || lead.closer_id) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => onClaim(lead.id)}
      className="inline-flex items-center gap-2 rounded-xl bg-violet-500/15 px-3 py-2 text-sm font-medium text-violet-200 ring-1 ring-violet-500/25 transition-colors hover:bg-violet-500/25"
    >
      <Handshake className="h-4 w-4" />
      Lead übernehmen
    </button>
  );
}
