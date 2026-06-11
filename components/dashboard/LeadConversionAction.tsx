"use client";

import { useState } from "react";
import type { Lead } from "@/lib/dashboard/types";

interface LeadConversionActionProps {
  lead: Lead;
  onConvert: (leadId: string) => Promise<void>;
}

export function LeadConversionAction({
  lead,
  onConvert,
}: LeadConversionActionProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (lead.converted_to_client) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/25 ring-inset">
        Kunde erstellt
      </span>
    );
  }

  if (lead.status !== "won") return null;

  const handleClick = async () => {
    if (
      !confirm(
        `Lead „${lead.company_name}“ wirklich in einen Kunden umwandeln?`,
      )
    ) {
      return;
    }

    setIsConverting(true);
    setError(null);
    try {
      await onConvert(lead.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Umwandlung fehlgeschlagen",
      );
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isConverting}
        className="dashboard-btn-secondary w-full px-3 py-1.5 text-xs sm:w-auto"
      >
        {isConverting ? "Wird umgewandelt..." : "In Kunde umwandeln"}
      </button>
      {error && (
        <p className="text-xs text-red-300">{error}</p>
      )}
    </div>
  );
}
