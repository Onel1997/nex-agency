export const INVOICE_COMPANY = {
  name: "NexAgency",
  tagline: "Digital Agency CRM",
  street: "Hansastraße 54",
  postalCode: "81373",
  city: "München",
  state: "Bayern",
  country: "Deutschland",
  email: "info@nexagency.de",
  legalForm: "Einzelunternehmen",
} as const;

export const INVOICE_PAYMENT = {
  accountHolder: "Onil Bashir Nasser",
  iban: "DE03 7015 0000 1007 6527 02",
  paymentTermLabel: "14 Tage nach Rechnungsdatum",
} as const;

export const INVOICE_PAYMENT_TERM_DAYS = 14;
