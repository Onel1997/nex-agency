import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { formatCents, formatDate } from "./format";
import { registerInvoicePdfFonts } from "./invoice-pdf-fonts";
import type { InvoiceWithDetails } from "./types";

function formatEuroLine(cents: number): string {
  return formatCents(cents).replace(/\s/g, " ");
}

function escapePdfLiteral(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Minimal PDF using PDF built-in Helvetica (no AFM files on disk). */
function generateFallbackInvoicePdfBuffer(invoice: InvoiceWithDetails): Buffer {
  const { client, items } = invoice;
  const lines = [
    "NexAgency",
    "RECHNUNG",
    `Rechnungsnr.: ${invoice.invoice_number}`,
    `Datum: ${formatDate(invoice.created_at)}`,
    "",
    "Rechnungsempfaenger:",
    client.company_name,
    client.customer_number ? `Kundennr.: ${client.customer_number}` : "",
    client.contact_name ?? "",
    client.email ?? "",
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
    "NexAgency - Diese Rechnung wurde automatisch erstellt.",
  ].filter(Boolean);

  let y = 780;
  const contentParts = ["BT", "/F1 10 Tf"];
  for (const line of lines) {
    contentParts.push(`1 0 0 1 50 ${y} Tm (${escapePdfLiteral(line)}) Tj`);
    y -= 14;
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

  doc
    .fillColor("#7c3aed")
    .fontSize(28)
    .font(fonts.bold)
    .text("NexAgency", 50, 45);

  doc
    .fillColor("#22d3ee")
    .fontSize(10)
    .font(fonts.regular)
    .text("Digital Agency CRM", 50, 78);

  doc
    .fillColor("#111827")
    .fontSize(22)
    .font(fonts.bold)
    .text("RECHNUNG", 400, 50, { align: "right", width: 145 });

  doc
    .fontSize(10)
    .font(fonts.regular)
    .fillColor("#4b5563")
    .text(`Rechnungsnr.: ${invoice.invoice_number}`, 400, 80, {
      align: "right",
      width: 145,
    })
    .text(`Datum: ${formatDate(invoice.created_at)}`, 400, 95, {
      align: "right",
      width: 145,
    });

  doc.moveDown(3);
  const leftY = doc.y;

  doc
    .fillColor("#111827")
    .fontSize(11)
    .font(fonts.bold)
    .text("Rechnungsempfänger", 50, leftY);

  doc
    .font(fonts.regular)
    .fontSize(10)
    .fillColor("#374151")
    .text(client.company_name, 50, leftY + 18);

  let detailY = leftY + 34;
  if (client.customer_number) {
    doc.text(`Kundennr.: ${client.customer_number}`, 50, detailY);
    detailY += 14;
  }
  if (client.contact_name) {
    doc.text(client.contact_name, 50, detailY);
    detailY += 14;
  }
  if (client.email) {
    doc.text(client.email, 50, detailY);
    detailY += 14;
  }
  if (client.phone) {
    doc.text(client.phone, 50, detailY);
  }

  const tableTop = Math.max(detailY + 30, 220);
  const colDesc = 50;
  const colQty = 320;
  const colUnit = 380;
  const colTotal = 480;

  doc
    .font(fonts.bold)
    .fontSize(9)
    .fillColor("#6b7280")
    .text("POSITION", colDesc, tableTop)
    .text("MENGE", colQty, tableTop)
    .text("EINZELPREIS", colUnit, tableTop)
    .text("SUMME", colTotal, tableTop, { align: "right", width: 65 });

  doc
    .moveTo(50, tableTop + 14)
    .lineTo(545, tableTop + 14)
    .strokeColor("#e5e7eb")
    .stroke();

  let rowY = tableTop + 24;
  doc.font(fonts.regular).fontSize(10).fillColor("#111827");

  for (const item of items) {
    doc.text(item.description, colDesc, rowY, { width: 250 });
    doc.text(String(item.quantity), colQty, rowY);
    doc.text(formatEuroLine(item.unit_price_cents), colUnit, rowY);
    doc.text(formatEuroLine(item.line_total_cents), colTotal, rowY, {
      align: "right",
      width: 65,
    });
    rowY += Math.max(20, doc.heightOfString(item.description, { width: 250 }) + 6);
  }

  const totalsY = rowY + 20;
  doc
    .moveTo(350, totalsY - 10)
    .lineTo(545, totalsY - 10)
    .strokeColor("#e5e7eb")
    .stroke();

  const totals = [
    ["Netto", formatEuroLine(invoice.subtotal_cents)],
    [`MwSt. (${invoice.vat_rate}%)`, formatEuroLine(invoice.tax_amount_cents)],
    ["Gesamtbetrag", formatEuroLine(invoice.total_amount_cents)],
  ];

  let totalRowY = totalsY;
  for (const [label, value] of totals) {
    const isTotal = label === "Gesamtbetrag";
    doc
      .font(isTotal ? fonts.bold : fonts.regular)
      .fontSize(isTotal ? 11 : 10)
      .fillColor(isTotal ? "#111827" : "#4b5563")
      .text(label, 350, totalRowY)
      .text(value, 480, totalRowY, { align: "right", width: 65 });
    totalRowY += isTotal ? 22 : 18;
  }

  doc
    .fontSize(8)
    .font(fonts.regular)
    .fillColor("#9ca3af")
    .text(
      "NexAgency · Diese Rechnung wurde automatisch erstellt.",
      50,
      780,
      { align: "center", width: 495 },
    );
}

async function generateInvoicePdfWithPdfKit(
  invoice: InvoiceWithDetails,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, autoFirstPage: true });
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
