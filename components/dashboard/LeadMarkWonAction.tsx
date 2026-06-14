"use client";

import { Trophy } from "lucide-react";
import type { Lead } from "@/lib/dashboard/types";

interface LeadMarkWonActionProps {
  lead: Lead;
  canMarkWon: boolean;
  onMarkWon: (leadId: string) => Promise<void>;
}

export function LeadMarkWonAction({
  lead,
  canMarkWon,
  onMarkWon,
}: LeadMarkWonActionProps) {
  if (!canMarkWon || lead.status === "won" || lead.converted_to_client) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => onMarkWon(lead.id)}
      className="dashboard-btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs"
    >
      <Trophy className="h-3.5 w-3.5" />
      Als gewonnen markieren
    </button>
  );
}
