import PDFDocument from "pdfkit";
import { formatCents, formatDate } from "./format";
import { INVOICE_COMPANY } from "./invoice-company";
import { registerInvoicePdfFonts } from "./invoice-pdf-fonts";
import type { FreelancerProfileInvoiceWithDetails } from "./types";

function formatEuroLine(cents: number): string {
  return formatCents(cents).replace(/\s/g, " ");
}

const PAGE = {
  margin: 50,
  width: 595,
  height: 842,
  bottom: 792,
} as const;

const RIGHT_COL_X = 368;
const RIGHT_COL_WIDTH = 177;
const LINE = 11;
const LABEL_GAP = 4;
const SECTION_GAP = 5;

const COLORS = {
  title: "#111827",
  body: "#1f2937",
  muted: "#6b7280",
  accent: "#7c3aed",
  rule: "#e5e7eb",
} as const;

function renderLabelValueLine(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  options?: { align?: "left" | "right"; highlight?: boolean },
): number {
  const align = options?.align ?? "left";
  const highlight = options?.highlight ?? false;

  doc.fontSize(8).font(fonts.regular).fillColor(COLORS.muted);
  doc.text(`${label}:`, x, y, { align, width });
  y += LINE;

  doc
    .fontSize(highlight ? 10 : 9)
    .font(highlight ? fonts.bold : fonts.regular)
    .fillColor(COLORS.title)
    .text(value, x, y, { align, width });

  return y + LINE + SECTION_GAP;
}

function renderFreelancerBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  invoice: FreelancerProfileInvoiceWithDetails,
): number {
  const { profile } = invoice;
  let y: number = PAGE.margin;

  const displayName =
    profile.business_name?.trim() ||
    invoice.freelancer_name;

  doc
    .fillColor(COLORS.accent)
    .fontSize(22)
    .font(fonts.bold)
    .text(displayName, PAGE.margin, y);
  y += 24;

  if (profile.business_name && invoice.freelancer_name !== profile.business_name) {
    doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text(invoice.freelancer_name, PAGE.margin, y);
    y += LINE;
  }

  if (profile.street) {
    doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text(profile.street, PAGE.margin, y);
    y += LINE;
  }

  if (profile.postal_code || profile.city) {
    doc
      .fontSize(9)
      .font(fonts.regular)
      .fillColor(COLORS.body)
      .text(
        [profile.postal_code, profile.city].filter(Boolean).join(" "),
        PAGE.margin,
        y,
      );
    y += LINE;
  }

  if (profile.country) {
    doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text(profile.country, PAGE.margin, y);
    y += LINE;
  }

  if (invoice.freelancer_email) {
    y += LABEL_GAP;
    doc.fontSize(8).fillColor(COLORS.muted).text(invoice.freelancer_email, PAGE.margin, y);
    y += LINE;
  }

  if (profile.tax_number) {
    doc.fontSize(8).fillColor(COLORS.muted).text(`St.-Nr.: ${profile.tax_number}`, PAGE.margin, y);
    y += LINE;
  }

  if (profile.vat_id) {
    doc.fontSize(8).fillColor(COLORS.muted).text(`USt-ID: ${profile.vat_id}`, PAGE.margin, y);
    y += LINE;
  }

  return y;
}

function renderInvoiceMetaBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  invoice: FreelancerProfileInvoiceWithDetails,
): number {
  let y: number = PAGE.margin;

  doc
    .fillColor(COLORS.title)
    .fontSize(18)
    .font(fonts.bold)
    .text("RECHNUNG", RIGHT_COL_X, y, { align: "right", width: RIGHT_COL_WIDTH });
  y += 26;

  y = renderLabelValueLine(
    doc,
    fonts,
    RIGHT_COL_X,
    y,
    RIGHT_COL_WIDTH,
    "Rechnungsnummer",
    invoice.invoice_number,
    { align: "right", highlight: true },
  );

  y = renderLabelValueLine(
    doc,
    fonts,
    RIGHT_COL_X,
    y,
    RIGHT_COL_WIDTH,
    "Rechnungsdatum",
    formatDate(`${invoice.invoice_date}T12:00:00`),
    { align: "right" },
  );

  return y - SECTION_GAP;
}

function renderRecipientBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  startY: number,
): number {
  let y = startY;

  doc
    .fontSize(10)
    .font(fonts.bold)
    .fillColor(COLORS.title)
    .text("Rechnungsempfänger", PAGE.margin, y);
  y += 15;

  doc.fontSize(9).font(fonts.bold).fillColor(COLORS.title).text(INVOICE_COMPANY.name, PAGE.margin, y);
  y += LINE;
  doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text(INVOICE_COMPANY.legalForm, PAGE.margin, y);
  y += LINE + LABEL_GAP;
  doc.text(INVOICE_COMPANY.street, PAGE.margin, y);
  y += LINE;
  doc.text(`${INVOICE_COMPANY.postalCode} ${INVOICE_COMPANY.city}`, PAGE.margin, y);
  y += LINE;
  doc.text(INVOICE_COMPANY.country, PAGE.margin, y);
  y += LINE + LABEL_GAP;
  doc.fontSize(8).fillColor(COLORS.muted).text(INVOICE_COMPANY.email, PAGE.margin, y);
  y += LINE;

  return y;
}

function renderProjectBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  invoice: FreelancerProfileInvoiceWithDetails,
  startY: number,
): number {
  let y = startY + 8;

  doc
    .fontSize(10)
    .font(fonts.bold)
    .fillColor(COLORS.title)
    .text("Leistungsbeschreibung", PAGE.margin, y);
  y += 16;

  doc
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.width - PAGE.margin, y)
    .strokeColor(COLORS.rule)
    .stroke();
  y += 10;

  const description = `Freelancer-Leistung für Projekt „${invoice.client_name}"`;
  doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body);
  doc.text(description, PAGE.margin, y, { width: PAGE.width - PAGE.margin * 2 });
  y += doc.heightOfString(description, { width: PAGE.width - PAGE.margin * 2 }) + 12;

  y = renderLabelValueLine(doc, fonts, PAGE.margin, y, 280, "Kunde", invoice.client_name);
  y = renderLabelValueLine(
    doc,
    fonts,
    PAGE.margin,
    y,
    280,
    "Betrag",
    formatEuroLine(invoice.amount_cents),
    { highlight: true },
  );

  return y;
}

function renderPaymentBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  invoice: FreelancerProfileInvoiceWithDetails,
  startY: number,
): number {
  let y = startY + 10;
  const { profile } = invoice;

  doc
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.width - PAGE.margin, y)
    .strokeColor(COLORS.rule)
    .stroke();
  y += 12;

  doc
    .fontSize(10)
    .font(fonts.bold)
    .fillColor(COLORS.title)
    .text("Zahlungsinformationen", PAGE.margin, y);
  y += 15;

  if (profile.bank_name) {
    y = renderLabelValueLine(doc, fonts, PAGE.margin, y, 280, "Bank", profile.bank_name);
  }
  if (profile.iban) {
    y = renderLabelValueLine(doc, fonts, PAGE.margin, y, 280, "IBAN", profile.iban);
  }
  if (profile.bic) {
    y = renderLabelValueLine(doc, fonts, PAGE.margin, y, 280, "BIC", profile.bic);
  }

  return y;
}

export async function generateFreelancerProfileInvoicePdfBuffer(
  invoice: FreelancerProfileInvoiceWithDetails,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE.margin, autoFirstPage: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const fonts = registerInvoicePdfFonts(doc);
      if (!fonts) {
        reject(new Error("Invoice fonts not available"));
        return;
      }

      const senderBottomY = renderFreelancerBlock(doc, fonts, invoice);
      const metaBottomY = renderInvoiceMetaBlock(doc, fonts, invoice);
      const recipientTopY = Math.max(senderBottomY, metaBottomY) + 10;
      const recipientBottomY = renderRecipientBlock(doc, fonts, recipientTopY);
      const projectEndY = renderProjectBlock(doc, fonts, invoice, recipientBottomY);
      renderPaymentBlock(doc, fonts, invoice, projectEndY);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
