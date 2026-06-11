import PDFDocument from "pdfkit";
import { formatCents, formatDate } from "./format";
import { INVOICE_COMPANY } from "./invoice-company";
import { registerInvoicePdfFonts } from "./invoice-pdf-fonts";
import type { FreelancerInvoiceWithDetails } from "./types";

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
const TOTALS_HEIGHT = 44;
const CLOSING_BLOCK_HEIGHT = 100;

const COLORS = {
  title: "#111827",
  body: "#1f2937",
  muted: "#6b7280",
  accent: "#7c3aed",
  tagline: "#0891b2",
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
  invoice: FreelancerInvoiceWithDetails,
): number {
  const { freelancer } = invoice;
  let y: number = PAGE.margin;

  const displayName = freelancer.company_name?.trim() || freelancer.name;

  doc
    .fillColor(COLORS.accent)
    .fontSize(22)
    .font(fonts.bold)
    .text(displayName, PAGE.margin, y);
  y += 24;

  if (freelancer.company_name && freelancer.name !== freelancer.company_name) {
    doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text(freelancer.name, PAGE.margin, y);
    y += LINE;
  }

  if (freelancer.contact_person) {
    doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text(freelancer.contact_person, PAGE.margin, y);
    y += LINE;
  }

  if (freelancer.street) {
    doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text(freelancer.street, PAGE.margin, y);
    y += LINE;
  }

  if (freelancer.postal_code || freelancer.city) {
    doc
      .fontSize(9)
      .font(fonts.regular)
      .fillColor(COLORS.body)
      .text(
        [freelancer.postal_code, freelancer.city].filter(Boolean).join(" "),
        PAGE.margin,
        y,
      );
    y += LINE;
  }

  if (freelancer.country) {
    doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text(freelancer.country, PAGE.margin, y);
    y += LINE;
  }

  if (freelancer.email) {
    y += LABEL_GAP;
    doc.fontSize(8).fillColor(COLORS.muted).text(freelancer.email, PAGE.margin, y);
    y += LINE;
  }

  if (freelancer.tax_number) {
    doc.fontSize(8).fillColor(COLORS.muted).text(`St.-Nr.: ${freelancer.tax_number}`, PAGE.margin, y);
    y += LINE;
  }

  if (freelancer.vat_id) {
    doc.fontSize(8).fillColor(COLORS.muted).text(`USt-ID: ${freelancer.vat_id}`, PAGE.margin, y);
    y += LINE;
  }

  return y;
}

function renderInvoiceMetaBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  invoice: FreelancerInvoiceWithDetails,
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
    formatDate(invoice.created_at),
    { align: "right" },
  );

  if (invoice.due_date) {
    y = renderLabelValueLine(
      doc,
      fonts,
      RIGHT_COL_X,
      y,
      RIGHT_COL_WIDTH,
      "Zahlungsziel",
      formatDate(`${invoice.due_date}T12:00:00`),
      { align: "right" },
    );
  }

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

function renderDescriptionBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  invoice: FreelancerInvoiceWithDetails,
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

  doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body);
  doc.text(invoice.description, PAGE.margin, y, { width: PAGE.width - PAGE.margin * 2 });

  return y + doc.heightOfString(invoice.description, { width: PAGE.width - PAGE.margin * 2 }) + 12;
}

function renderTotalsSection(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  invoice: FreelancerInvoiceWithDetails,
  startY: number,
): number {
  let totalRowY = startY + 6;

  doc
    .moveTo(350, totalRowY - 5)
    .lineTo(PAGE.width - PAGE.margin, totalRowY - 5)
    .strokeColor(COLORS.rule)
    .stroke();

  const totals = [
    ["Netto", formatEuroLine(invoice.subtotal_cents)],
    [`MwSt. (${invoice.vat_rate}%)`, formatEuroLine(invoice.tax_amount_cents)],
    ["Gesamtbetrag", formatEuroLine(invoice.total_amount_cents)],
  ];

  for (const [label, value] of totals) {
    const isTotal = label === "Gesamtbetrag";
    doc
      .font(isTotal ? fonts.bold : fonts.regular)
      .fontSize(isTotal ? 10 : 9)
      .fillColor(isTotal ? COLORS.title : COLORS.muted)
      .text(label, 350, totalRowY)
      .text(value, 480, totalRowY, { align: "right", width: 65 });
    totalRowY += isTotal ? 16 : 14;
  }

  return totalRowY;
}

function renderPaymentBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  invoice: FreelancerInvoiceWithDetails,
  startY: number,
): number {
  let y = startY + 10;
  const { freelancer } = invoice;

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

  if (freelancer.iban) {
    y = renderLabelValueLine(doc, fonts, PAGE.margin, y, 280, "IBAN", freelancer.iban);
  }
  if (freelancer.bic) {
    y = renderLabelValueLine(doc, fonts, PAGE.margin, y, 280, "BIC", freelancer.bic);
  }

  return y;
}

export async function generateFreelancerInvoicePdfBuffer(
  invoice: FreelancerInvoiceWithDetails,
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
      const descriptionEndY = renderDescriptionBlock(doc, fonts, invoice, recipientBottomY);

      let contentY = descriptionEndY;
      const closingHeight = TOTALS_HEIGHT + CLOSING_BLOCK_HEIGHT;
      if (contentY + closingHeight > PAGE.bottom) {
        doc.addPage();
        contentY = PAGE.margin;
      }

      const totalsEndY = renderTotalsSection(doc, fonts, invoice, contentY);
      renderPaymentBlock(doc, fonts, invoice, totalsEndY);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
