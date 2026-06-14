import PDFDocument from "pdfkit";
import { formatCents, formatDate } from "./format";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  type ContractStatus,
  type ContractType,
} from "./contract-constants";
import { INVOICE_COMPANY } from "./invoice-company";
import { registerInvoicePdfFonts } from "./invoice-pdf-fonts";
import type { ContractWithDetails } from "./types";

const PAGE = { margin: 50 } as const;
const LINE = 14;

const COLORS = {
  title: "#111827",
  body: "#1f2937",
  muted: "#6b7280",
  accent: "#7c3aed",
} as const;

function formatAddress(contract: ContractWithDetails): string {
  const parts: string[] = [];
  if (contract.profile_street) parts.push(contract.profile_street);
  const cityLine = [contract.profile_postal_code, contract.profile_city]
    .filter(Boolean)
    .join(" ");
  if (cityLine) parts.push(cityLine);
  if (contract.profile_country) parts.push(contract.profile_country);
  return parts.length > 0 ? parts.join("\n") : "—";
}

function pdfToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function generateContractPdfBuffer(
  contract: ContractWithDetails,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: PAGE.margin });
  const fonts = registerInvoicePdfFonts(doc);
  const regular = fonts?.regular ?? "Helvetica";
  const bold = fonts?.bold ?? "Helvetica-Bold";

  let y: number = PAGE.margin;

  doc.fillColor(COLORS.accent).fontSize(22).font(bold).text(INVOICE_COMPANY.name, PAGE.margin, y);
  y += 28;
  doc.fontSize(9).font(regular).fillColor(COLORS.muted).text(INVOICE_COMPANY.street, PAGE.margin, y);
  y += LINE;
  doc.text(`${INVOICE_COMPANY.postalCode} ${INVOICE_COMPANY.city}`, PAGE.margin, y);
  y += LINE;
  doc.text(INVOICE_COMPANY.email, PAGE.margin, y);
  y += 28;

  doc.fontSize(16).font(bold).fillColor(COLORS.title).text("Vertrag", PAGE.margin, y);
  y += 24;

  const rows: [string, string][] = [
    ["Vertragsnummer", contract.contract_number],
    ["Titel", contract.title],
    ["Status", CONTRACT_STATUS_LABELS[contract.status as ContractStatus] ?? contract.status],
    ["Vertragstyp", CONTRACT_TYPE_LABELS[contract.contract_type as ContractType] ?? contract.contract_type],
    ["Name", contract.profile_name],
    ["E-Mail", contract.profile_email],
    ["Adresse", formatAddress(contract)],
    ["Agenturrolle", contract.profile_agency_role_label],
    ["Beschäftigungsart", contract.profile_employment_type_label],
    ["Beginn", contract.start_date ? formatDate(contract.start_date) : "—"],
    ["Ende", contract.end_date ? formatDate(contract.end_date) : "—"],
    [
      "Monatsgehalt",
      contract.monthly_salary_cents != null
        ? formatCents(contract.monthly_salary_cents)
        : "—",
    ],
    [
      "Provision",
      contract.commission_rate != null ? `${contract.commission_rate} %` : "—",
    ],
  ];

  for (const [label, value] of rows) {
    doc.fontSize(8).font(regular).fillColor(COLORS.muted).text(`${label}:`, PAGE.margin, y);
    y += 12;
    doc.fontSize(10).font(bold).fillColor(COLORS.body).text(value, PAGE.margin, y, {
      width: 495,
    });
    y += LINE + 6;
  }

  if (contract.notes?.trim()) {
    y += 8;
    doc.fontSize(8).font(regular).fillColor(COLORS.muted).text("Notizen:", PAGE.margin, y);
    y += 12;
    doc.fontSize(9).font(regular).fillColor(COLORS.body).text(contract.notes.trim(), PAGE.margin, y, {
      width: 495,
    });
    y += LINE + 12;
  }

  if (contract.signed_at) {
    doc
      .fontSize(8)
      .font(regular)
      .fillColor(COLORS.muted)
      .text(`Unterzeichnet am ${formatDate(contract.signed_at)}`, PAGE.margin, y);
  }

  y = 760;
  doc
    .fontSize(8)
    .font(regular)
    .fillColor(COLORS.muted)
    .text(
      "Dieses Dokument wurde automatisch von NexAgency erstellt.",
      PAGE.margin,
      y,
      { align: "center", width: 495 },
    );

  return pdfToBuffer(doc);
}
