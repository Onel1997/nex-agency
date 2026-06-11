export const DEFAULT_VAT_RATE = 19;

export interface InvoiceAmounts {
  subtotalCents: number;
  taxAmountCents: number;
  totalAmountCents: number;
  vatRate: number;
}

export function calculateInvoiceAmounts(
  subtotalCents: number,
  vatRate: number = DEFAULT_VAT_RATE,
): InvoiceAmounts {
  if (subtotalCents < 0) {
    throw new Error("Nettobetrag darf nicht negativ sein");
  }

  const taxAmountCents = Math.round(subtotalCents * (vatRate / 100));
  const totalAmountCents = subtotalCents + taxAmountCents;

  return {
    subtotalCents,
    taxAmountCents,
    totalAmountCents,
    vatRate,
  };
}
