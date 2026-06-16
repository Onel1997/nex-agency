export const PAYOUT_DERIVED_STATUSES = [
  "offen",
  "freigegeben",
  "ausgezahlt",
  "abgeschlossen",
] as const;

export type PayoutDerivedStatus = (typeof PAYOUT_DERIVED_STATUSES)[number];

export const PAYOUT_DERIVED_STATUS_LABELS: Record<PayoutDerivedStatus, string> = {
  offen: "Offen",
  freigegeben: "Freigegeben",
  ausgezahlt: "Ausgezahlt",
  abgeschlossen: "Abgeschlossen",
};

export const DEFAULT_PAYOUT_CENTER_TAB: PayoutDerivedStatus = "offen";
