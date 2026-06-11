import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { formatCents, formatDate } from "./format";
import {
  INVOICE_COMPANY,
  INVOICE_PAYMENT,
  INVOICE_PAYMENT_TERM_DAYS,
} from "./invoice-company";
import { registerInvoicePdfFonts } from "./invoice-pdf-fonts";
import { formatInvoiceDueDate } from "./invoice-dates";
import type { InvoiceClientSnapshot, InvoiceWithDetails } from "./types";

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
const TABLE_ROW_MIN = 15;
const TABLE_HEADER_HEIGHT = 18;
const TOTALS_HEIGHT = 44;
const CLOSING_BLOCK_HEIGHT = 132;

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

function renderCompanyBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
): number {
  let y: number = PAGE.margin;

  doc
    .fillColor(COLORS.accent)
    .fontSize(22)
    .font(fonts.bold)
    .text(INVOICE_COMPANY.name, PAGE.margin, y);
  y += 24;

  doc
    .fillColor(COLORS.tagline)
    .fontSize(9)
    .font(fonts.regular)
    .text(INVOICE_COMPANY.tagline, PAGE.margin, y);
  y += 13;

  doc.fontSize(8).fillColor(COLORS.muted).text(INVOICE_COMPANY.legalForm, PAGE.margin, y);
  y += 16;

  doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body);
  doc.text(INVOICE_COMPANY.street, PAGE.margin, y);
  y += LINE;
  doc.text(`${INVOICE_COMPANY.postalCode} ${INVOICE_COMPANY.city}`, PAGE.margin, y);
  y += LINE;
  doc.text(INVOICE_COMPANY.country, PAGE.margin, y);
  y += LINE + LABEL_GAP;
  doc.fillColor(COLORS.muted).text(INVOICE_COMPANY.email, PAGE.margin, y);
  y += LINE;

  return y;
}

function renderInvoiceMetaBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  invoice: InvoiceWithDetails,
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

  if (invoice.client.customer_number) {
    y = renderLabelValueLine(
      doc,
      fonts,
      RIGHT_COL_X,
      y,
      RIGHT_COL_WIDTH,
      "Kundennummer",
      invoice.client.customer_number,
      { align: "right", highlight: true },
    );
  }

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

  y = renderLabelValueLine(
    doc,
    fonts,
    RIGHT_COL_X,
    y,
    RIGHT_COL_WIDTH,
    "Fällig bis",
    formatInvoiceDueDate(invoice.due_date, invoice.created_at),
    { align: "right" },
  );

  return y - SECTION_GAP;
}

function renderRecipientBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  client: InvoiceClientSnapshot,
  startY: number,
): number {
  let y = startY;

  doc
    .fontSize(10)
    .font(fonts.bold)
    .fillColor(COLORS.title)
    .text("Rechnungsempfänger", PAGE.margin, y);
  y += 15;

  if (client.contact_name) {
    doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text(client.contact_name, PAGE.margin, y);
    y += LINE;
  }

  doc.fontSize(9).font(fonts.bold).fillColor(COLORS.title).text(client.company_name, PAGE.margin, y);
  y += LINE + LABEL_GAP;

  if (client.customer_number) {
    doc
      .fontSize(9)
      .font(fonts.regular)
      .fillColor(COLORS.body)
      .text(`Kundennummer: ${client.customer_number}`, PAGE.margin, y);
    y += LINE + LABEL_GAP;
  }

  if (client.email) {
    doc.fontSize(8).font(fonts.regular).fillColor(COLORS.muted).text("E-Mail:", PAGE.margin, y);
    y += LINE;
    doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text(client.email, PAGE.margin, y);
    y += LINE + LABEL_GAP;
  }

  if (client.phone) {
    doc.fontSize(8).font(fonts.regular).fillColor(COLORS.muted).text("Telefon:", PAGE.margin, y);
    y += LINE;
    doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text(client.phone, PAGE.margin, y);
    y += LINE;
  }

  return y;
}

function renderTableHeader(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  tableTop: number,
): void {
  const colDesc = PAGE.margin;
  const colQty = 320;
  const colUnit = 380;
  const colTotal = 480;

  doc
    .font(fonts.bold)
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text("POSITION", colDesc, tableTop)
    .text("MENGE", colQty, tableTop)
    .text("EINZELPREIS", colUnit, tableTop)
    .text("SUMME", colTotal, tableTop, { align: "right", width: 65 });

  doc
    .moveTo(PAGE.margin, tableTop + 11)
    .lineTo(PAGE.width - PAGE.margin, tableTop + 11)
    .strokeColor(COLORS.rule)
    .stroke();
}

function measureRowHeight(
  doc: InstanceType<typeof PDFDocument>,
  description: string,
): number {
  return Math.max(
    TABLE_ROW_MIN,
    doc.heightOfString(description, { width: 250 }) + 3,
  );
}

function renderTableRow(
  doc: InstanceType<typeof PDFDocument>,
  item: InvoiceWithDetails["items"][number],
  rowY: number,
): void {
  const colDesc = PAGE.margin;
  const colQty = 320;
  const colUnit = 380;
  const colTotal = 480;

  doc.text(item.description, colDesc, rowY, { width: 250 });
  doc.text(String(item.quantity), colQty, rowY);
  doc.text(formatEuroLine(item.unit_price_cents), colUnit, rowY);
  doc.text(formatEuroLine(item.line_total_cents), colTotal, rowY, {
    align: "right",
    width: 65,
  });
}

function renderTotalsSection(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  invoice: InvoiceWithDetails,
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

function renderPaymentAndClosing(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  startY: number,
): number {
  let y = startY + 10;

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

  y = renderLabelValueLine(
    doc,
    fonts,
    PAGE.margin,
    y,
    280,
    "Kontoinhaber",
    INVOICE_PAYMENT.accountHolder,
  );
  y = renderLabelValueLine(doc, fonts, PAGE.margin, y, 280, "IBAN", INVOICE_PAYMENT.iban);
  y = renderLabelValueLine(
    doc,
    fonts,
    PAGE.margin,
    y,
    280,
    "Zahlungsziel",
    INVOICE_PAYMENT.paymentTermLabel,
  );

  y += 2;
  doc
    .fontSize(9)
    .font(fonts.regular)
    .fillColor(COLORS.title)
    .text("Vielen Dank für Ihren Auftrag.", PAGE.margin, y);
  y += LINE + LABEL_GAP;

  doc
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text("Bei Fragen zur Rechnung kontaktieren Sie uns unter:", PAGE.margin, y);
  y += LINE;
  doc.fontSize(9).fillColor(COLORS.body).text(INVOICE_COMPANY.email, PAGE.margin, y);

  return y + LINE;
}

function renderItemTable(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  items: InvoiceWithDetails["items"],
  tableTop: number,
): number {
  renderTableHeader(doc, fonts, tableTop);

  let rowY = tableTop + TABLE_HEADER_HEIGHT;
  doc.font(fonts.regular).fontSize(9).fillColor(COLORS.title);

  const reservedClosingHeight = TOTALS_HEIGHT + CLOSING_BLOCK_HEIGHT + 8;
  const tableBreakWithClosing = PAGE.bottom - reservedClosingHeight;
  const tableBreakFull = PAGE.bottom - PAGE.margin;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const rowHeight = measureRowHeight(doc, item.description);
    const isLastRow = index === items.length - 1;
    const breakY = isLastRow ? tableBreakWithClosing : tableBreakFull;

    if (rowY + rowHeight > breakY) {
      doc.addPage();
      const continuedTop = PAGE.margin;
      renderTableHeader(doc, fonts, continuedTop);
      rowY = continuedTop + TABLE_HEADER_HEIGHT;
    }

    renderTableRow(doc, item, rowY);
    rowY += rowHeight;
  }

  return rowY;
}

function escapePdfLiteral(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildFallbackLines(invoice: InvoiceWithDetails): string[] {
  const { client, items } = invoice;
  const recipientLines = [
    "Rechnungsempfaenger:",
    ...(client.contact_name ? [client.contact_name] : []),
    client.company_name,
    ...(client.customer_number ? [`Kundennummer: ${client.customer_number}`] : []),
    ...(client.email ? ["E-Mail:", client.email] : []),
    ...(client.phone ? ["Telefon:", client.phone] : []),
  ];

  return [
    INVOICE_COMPANY.name,
    INVOICE_COMPANY.tagline,
    INVOICE_COMPANY.legalForm,
    "",
    INVOICE_COMPANY.street,
    `${INVOICE_COMPANY.postalCode} ${INVOICE_COMPANY.city}`,
    INVOICE_COMPANY.country,
    INVOICE_COMPANY.email,
    "",
    "RECHNUNG",
    "",
    "Rechnungsnummer:",
    invoice.invoice_number,
    ...(client.customer_number ? ["", "Kundennummer:", client.customer_number] : []),
    "",
    "Rechnungsdatum:",
    formatDate(invoice.created_at),
    "",
    "Faellig bis:",
    formatInvoiceDueDate(invoice.due_date, invoice.created_at),
    "",
    ...recipientLines,
    "",
    "Positionen:",
    ...items.map(
      (item) =>
        `- ${item.description} | ${item.quantity} x ${formatEuroLine(item.unit_price_cents)} = ${formatEuroLine(item.line_total_cents)}`,
    ),
    "",
    `Netto: ${formatEuroLine(invoice.subtotal_cents)}`,
    `MwSt. (${invoice.vat_rate}%): ${formatEuroLine(invoice.tax_amount_cents)}`,
    `Gesamtbetrag: ${formatEuroLine(invoice.total_amount_cents)}`,
    "",
    "Zahlungsinformationen",
    "",
    "Kontoinhaber:",
    INVOICE_PAYMENT.accountHolder,
    "IBAN:",
    INVOICE_PAYMENT.iban,
    "Zahlungsziel:",
    INVOICE_PAYMENT.paymentTermLabel,
    "",
    "Vielen Dank fuer Ihren Auftrag.",
    "",
    "Bei Fragen zur Rechnung kontaktieren Sie uns unter:",
    INVOICE_COMPANY.email,
  ];
}

/** Minimal PDF using PDF built-in Helvetica (no AFM files on disk). */
function generateFallbackInvoicePdfBuffer(invoice: InvoiceWithDetails): Buffer {
  const lines = buildFallbackLines(invoice);

  let y = 780;
  const contentParts = ["BT", "/F1 10 Tf"];
  for (const line of lines) {
    contentParts.push(`1 0 0 1 50 ${y} Tm (${escapePdfLiteral(line)}) Tj`);
    y -= 11;
  }
  contentParts.push("ET");
  const stream = `${contentParts.join("\n")}\n`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function renderInvoicePdf(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  invoice: InvoiceWithDetails,
): void {
  const { client, items } = invoice;

  const companyBottomY = renderCompanyBlock(doc, fonts);
  const metaBottomY = renderInvoiceMetaBlock(doc, fonts, invoice);
  const recipientTopY = Math.max(companyBottomY, metaBottomY) + 10;
  const recipientBottomY = renderRecipientBlock(doc, fonts, client, recipientTopY);

  const tableTop = recipientBottomY + 8;
  const tableEndY = renderItemTable(doc, fonts, items, tableTop);

  let contentY = tableEndY;
  const closingBlockHeight = TOTALS_HEIGHT + CLOSING_BLOCK_HEIGHT + 6;
  if (contentY + closingBlockHeight > PAGE.bottom) {
    doc.addPage();
    contentY = PAGE.margin;
  }

  const totalsEndY = renderTotalsSection(doc, fonts, invoice, contentY);
  renderPaymentAndClosing(doc, fonts, totalsEndY);
}

async function generateInvoicePdfWithPdfKit(
  invoice: InvoiceWithDetails,
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

      renderInvoicePdf(doc, fonts, invoice);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateInvoicePdfBuffer(
  invoice: InvoiceWithDetails,
): Promise<Buffer> {
  try {
    return await generateInvoicePdfWithPdfKit(invoice);
  } catch (error) {
    console.error(
      "PDFKit invoice generation failed, using built-in PDF fallback:",
      error instanceof Error ? error.message : error,
    );
    return generateFallbackInvoicePdfBuffer(invoice);
  }
}

/** Resolves bundled font path for diagnostics / deployment checks. */
export function resolveInvoiceFontPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"),
    path.join(process.cwd(), "assets", "fonts", "Inter-Regular.ttf"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export { INVOICE_PAYMENT_TERM_DAYS };
