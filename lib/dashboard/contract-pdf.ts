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
import {
  formatMasterDataAddress,
  formatMasterDataValue,
} from "./team-master-data";
import type { ContractWithDetails } from "./types";

const PAGE = { margin: 50 } as const;
const CONTENT_WIDTH = 495;
const LABEL_HEIGHT = 12;
const ROW_GAP = 6;

const COLORS = {
  title: "#111827",
  body: "#1f2937",
  muted: "#6b7280",
  accent: "#7c3aed",
} as const;

function pdfToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function measureRowHeight(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  value: string,
): number {
  doc.fontSize(10).font(fonts.bold);
  return LABEL_HEIGHT + doc.heightOfString(value, { width: CONTENT_WIDTH }) + ROW_GAP;
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
    y += LABEL_HEIGHT;
    doc.fontSize(10).font(fonts.bold).fillColor(COLORS.body);
    const valueHeight = doc.heightOfString(value, { width: CONTENT_WIDTH });
    doc.text(value, PAGE.margin, y, { width: CONTENT_WIDTH });
    y += valueHeight + ROW_GAP;
  }
  return y;
}

function estimateSectionHeight(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  rows: [string, string][],
  hasTitle: boolean,
): number {
  const titleHeight = hasTitle ? 26 : 0;
  const rowsHeight = rows.reduce(
    (total, [, value]) => total + measureRowHeight(doc, fonts, value),
    0,
  );
  return titleHeight + rowsHeight + 8;
}

function ensureSectionFits(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  y: number,
  title: string,
  rows: [string, string][],
): number {
  const neededHeight = estimateSectionHeight(doc, fonts, rows, true);
  const pageBottom = doc.page.height - PAGE.margin;

  if (y + neededHeight > pageBottom) {
    doc.addPage();
    return PAGE.margin;
  }

  return y;
}

function appendSection(
  doc: InstanceType<typeof PDFDocument>,
  fonts: { regular: string; bold: string },
  title: string,
  rows: [string, string][],
  startY: number,
): number {
  let y = ensureSectionFits(doc, fonts, startY, title, rows);
  y += 8;
  doc.fontSize(11).font(fonts.bold).fillColor(COLORS.title).text(title, PAGE.margin, y);
  y += 18;
  return appendRows(doc, fonts, rows, y);
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
  y += 14;
  doc.text(`${INVOICE_COMPANY.postalCode} ${INVOICE_COMPANY.city}`, PAGE.margin, y);
  y += 14;
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
    ["Telefon", formatMasterDataValue(contract.profile_phone)],
    [
      "Rolle",
      contract.agency_role
        ? getAgencyRoleLabel(contract.agency_role)
        : contract.profile_agency_role_label,
    ],
    ["Adresse", formatMasterDataAddress({
      street: contract.profile_street,
      house_number: contract.profile_house_number,
      postal_code: contract.profile_postal_code,
      city: contract.profile_city,
      country: contract.profile_country,
    })],
    ["Beginn", contract.start_date ? formatDate(contract.start_date) : "—"],
    ["Ende", contract.end_date ? formatDate(contract.end_date) : "—"],
  ];

  y = appendRows(doc, { regular, bold }, commonRows, y);

  if (contract.contract_category === "employee") {
    y = appendSection(doc, { regular, bold }, "Mitarbeiter-Konditionen", [
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

    y = appendSection(doc, { regular, bold }, "Zahlungs- & Steuerdaten", [
      ["IBAN", formatMasterDataValue(contract.profile_iban)],
      ["BIC", formatMasterDataValue(contract.profile_bic)],
      ["Bank", formatMasterDataValue(contract.profile_bank_name)],
      ["Steuer-ID", formatMasterDataValue(contract.profile_tax_id)],
      ["Sozialversicherung", formatMasterDataValue(contract.profile_social_security_number)],
      ["Krankenkasse", formatMasterDataValue(contract.profile_health_insurance)],
      ["Personalnummer", formatMasterDataValue(contract.profile_employee_number)],
      [
        "Geburtsdatum",
        contract.profile_birth_date
          ? formatDate(contract.profile_birth_date)
          : formatMasterDataValue(null),
      ],
    ], y);
  } else {
    y = appendSection(doc, { regular, bold }, "Freelancer-Konditionen", [
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

    y = appendSection(doc, { regular, bold }, "Zahlungs- & Steuerdaten", [
      ["Firma", formatMasterDataValue(contract.profile_business_name)],
      ["IBAN", formatMasterDataValue(contract.profile_iban)],
      ["BIC", formatMasterDataValue(contract.profile_bic)],
      ["Bank", formatMasterDataValue(contract.profile_bank_name)],
      ["Steuernummer", formatMasterDataValue(contract.profile_tax_number)],
      ["USt-ID", formatMasterDataValue(contract.profile_vat_id)],
    ], y);
  }

  if (contract.notes?.trim()) {
    y += 8;
    doc.fontSize(8).font(regular).fillColor(COLORS.muted).text("Notizen:", PAGE.margin, y);
    y += LABEL_HEIGHT;
    doc.fontSize(9).font(regular).fillColor(COLORS.body);
    const notesHeight = doc.heightOfString(contract.notes.trim(), { width: CONTENT_WIDTH });
    if (y + notesHeight > doc.page.height - PAGE.margin) {
      doc.addPage();
      y = PAGE.margin;
    }
    doc.text(contract.notes.trim(), PAGE.margin, y, { width: CONTENT_WIDTH });
    y += notesHeight + 12;
  }

  if (y > 620) {
    doc.addPage();
    y = PAGE.margin;
  }

  y += 8;
  doc.fontSize(11).font(bold).fillColor(COLORS.title).text("Unterschriften", PAGE.margin, y);
  y += 20;

  const signatureLineWidth = 220;
  const signatureGap = 35;

  doc.fontSize(9).font(regular).fillColor(COLORS.body).text("NexAgency:", PAGE.margin, y);
  y += 14;
  doc
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.margin + signatureLineWidth, y)
    .strokeColor(COLORS.muted)
    .stroke();
  y += 8;

  if (contract.signed_by_agency && contract.agency_signed_at) {
    doc
      .fontSize(8)
      .font(regular)
      .fillColor(COLORS.muted)
      .text(
        `Digital bestätigt am ${formatDate(contract.agency_signed_at)}`,
        PAGE.margin,
        y,
      );
    y += 14;
  } else {
    y += 14;
  }

  y += signatureGap;
  doc.fontSize(9).font(regular).fillColor(COLORS.body).text("Vertragspartner:", PAGE.margin, y);
  y += 14;
  doc
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.margin + signatureLineWidth, y)
    .strokeColor(COLORS.muted)
    .stroke();
  y += 8;

  if (contract.signed_by_partner && contract.partner_signed_at) {
    doc
      .fontSize(8)
      .font(regular)
      .fillColor(COLORS.muted)
      .text(
        `Digital bestätigt am ${formatDate(contract.partner_signed_at)}`,
        PAGE.margin,
        y,
      );
  } else if (contract.signed_at) {
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
      { align: "center", width: CONTENT_WIDTH },
    );

  return pdfToBuffer(doc);
}
