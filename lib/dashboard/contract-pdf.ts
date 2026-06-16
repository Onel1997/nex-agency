import PDFDocument from "pdfkit";
import { formatCents, formatDate } from "./format";
import {
  CONTRACT_CATEGORY_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  type ContractStatus,
  type ContractType,
} from "./contract-constants";
import { getAgencyRoleLabel } from "@/lib/auth/roles";
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

function appendRows(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  rows: [string, string][],
  startY: number,
): number {
  let y = startY;
  for (const [label, value] of rows) {
    doc.fontSize(8).font(fonts.regular).fillColor(COLORS.muted).text(`${label}:`, PAGE.margin, y);
    y += 12;
    doc.fontSize(10).font(fonts.bold).fillColor(COLORS.body).text(value, PAGE.margin, y, {
      width: 495,
    });
    y += LINE + 6;
  }
  return y;
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

  const categoryLabel = CONTRACT_CATEGORY_LABELS[contract.contract_category];
  doc.fontSize(16).font(bold).fillColor(COLORS.title).text(categoryLabel, PAGE.margin, y);
  y += 24;

  const commonRows: [string, string][] = [
    ["Vertragsnummer", contract.contract_number],
    ["Titel", contract.title],
    ["Status", CONTRACT_STATUS_LABELS[contract.status as ContractStatus] ?? contract.status],
    ["Vertragstyp", CONTRACT_TYPE_LABELS[contract.contract_type as ContractType] ?? contract.contract_type],
    ["Name", contract.profile_name],
    ["E-Mail", contract.profile_email],
    ["Adresse", formatAddress(contract)],
    [
      "Rolle",
      contract.agency_role
        ? getAgencyRoleLabel(contract.agency_role)
        : contract.profile_agency_role_label,
    ],
    ["Beginn", contract.start_date ? formatDate(contract.start_date) : "—"],
    ["Ende", contract.end_date ? formatDate(contract.end_date) : "—"],
  ];

  y = appendRows(doc, { regular, bold }, commonRows, y);

  if (contract.contract_category === "employee") {
    y += 8;
    doc.fontSize(11).font(bold).fillColor(COLORS.title).text("Mitarbeiter-Konditionen", PAGE.margin, y);
    y += 18;
    y = appendRows(doc, { regular, bold }, [
      [
        "Monatsgehalt",
        contract.monthly_salary_cents != null
          ? formatCents(contract.monthly_salary_cents)
          : "—",
      ],
      [
        "Arbeitszeit",
        contract.working_hours_per_week != null
          ? `${contract.working_hours_per_week} Std./Woche`
          : "—",
      ],
      [
        "Urlaubstage",
        contract.vacation_days_per_year != null
          ? `${contract.vacation_days_per_year} Tage/Jahr`
          : "—",
      ],
    ], y);
  } else {
    y += 8;
    doc.fontSize(11).font(bold).fillColor(COLORS.title).text("Freelancer-Konditionen", PAGE.margin, y);
    y += 18;
    y = appendRows(doc, { regular, bold }, [
      [
        "Setup-Provision",
        contract.setup_commission_rate != null
          ? `${contract.setup_commission_rate} %`
          : contract.commission_rate != null
            ? `${contract.commission_rate} %`
            : "—",
      ],
      [
        "Retainer-Provision",
        contract.retainer_commission_rate != null
          ? `${contract.retainer_commission_rate} %`
          : "—",
      ],
      [
        "Retainer-Monate",
        contract.retainer_commission_months != null
          ? String(contract.retainer_commission_months)
          : "—",
      ],
    ], y);

    y += 8;
    doc.fontSize(11).font(bold).fillColor(COLORS.title).text("Zahlungs- & Steuerdaten", PAGE.margin, y);
    y += 18;
    y = appendRows(doc, { regular, bold }, [
      ["Firma", contract.profile_business_name ?? "—"],
      ["IBAN", contract.profile_iban ?? "—"],
      ["BIC", contract.profile_bic ?? "—"],
      ["Bank", contract.profile_bank_name ?? "—"],
      ["Steuernummer", contract.profile_tax_number ?? "—"],
      ["USt-ID", contract.profile_vat_id ?? "—"],
    ], y);
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
