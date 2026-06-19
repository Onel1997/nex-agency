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
const LABEL_HEIGHT = 10;
const ROW_GAP = 3;
const SECTION_GAP = 5;
const SECTION_TITLE_HEIGHT = 14;

const COLORS = {
  title: "#111827",
  body: "#1f2937",
  muted: "#6b7280",
  accent: "#7c3aed",
} as const;

type PdfFonts = { regular: string; bold: string };

function pdfToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function pageBottom(doc: InstanceType<typeof PDFDocument>): number {
  return doc.page.height - PAGE.margin;
}

function measureTextHeight(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  fontSize: number,
  font: string,
  width: number = CONTENT_WIDTH,
): number {
  doc.fontSize(fontSize).font(font);
  return doc.heightOfString(text, { width });
}

function measureRowHeight(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  value: string,
): number {
  return LABEL_HEIGHT + measureTextHeight(doc, value, 10, fonts.bold) + ROW_GAP;
}

function ensureSpace(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  neededHeight: number,
): number {
  if (y + neededHeight > pageBottom(doc)) {
    doc.addPage();
    return PAGE.margin;
  }
  return y;
}

function appendRows(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  rows: [string, string][],
  startY: number,
): number {
  let y = startY;
  for (const [label, value] of rows) {
    const rowHeight = measureRowHeight(doc, fonts, value);
    y = ensureSpace(doc, y, rowHeight);
    doc.fontSize(8).font(fonts.regular).fillColor(COLORS.muted).text(`${label}:`, PAGE.margin, y);
    y += LABEL_HEIGHT;
    doc.fontSize(10).font(fonts.bold).fillColor(COLORS.body);
    const valueHeight = measureTextHeight(doc, value, 10, fonts.bold);
    doc.text(value, PAGE.margin, y, { width: CONTENT_WIDTH });
    y += valueHeight + ROW_GAP;
  }
  return y;
}

function estimateRowsHeight(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  rows: [string, string][],
): number {
  return rows.reduce((total, [, value]) => total + measureRowHeight(doc, fonts, value), 0);
}

function appendSection(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  title: string,
  rows: [string, string][],
  startY: number,
  options: { gapBefore?: number } = {},
): number {
  const gapBefore = options.gapBefore ?? SECTION_GAP;
  const sectionHeight =
    gapBefore + SECTION_TITLE_HEIGHT + estimateRowsHeight(doc, fonts, rows);
  let y = ensureSpace(doc, startY + gapBefore, sectionHeight - gapBefore);
  y += gapBefore;
  doc.fontSize(10).font(fonts.bold).fillColor(COLORS.title).text(title, PAGE.margin, y);
  y += SECTION_TITLE_HEIGHT;
  return appendRows(doc, fonts, rows, y);
}

function estimateSignatureBlockHeight(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  contract: ContractWithDetails,
): number {
  const titleHeight = SECTION_TITLE_HEIGHT + SECTION_GAP;
  const agencyNote =
    contract.signed_by_agency && contract.agency_signed_at
      ? measureTextHeight(
          doc,
          `Digital bestätigt am ${formatDate(contract.agency_signed_at)}`,
          8,
          fonts.regular,
        )
      : 0;
  const partnerNote =
    contract.signed_by_partner && contract.partner_signed_at
      ? measureTextHeight(
          doc,
          `Digital bestätigt am ${formatDate(contract.partner_signed_at)}`,
          8,
          fonts.regular,
        )
      : contract.signed_at
        ? measureTextHeight(
            doc,
            `Unterzeichnet am ${formatDate(contract.signed_at)}`,
            8,
            fonts.regular,
          )
        : 0;

  return titleHeight + 12 + 10 + agencyNote + 18 + 12 + 10 + partnerNote + 20;
}

function appendSignatures(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  contract: ContractWithDetails,
  startY: number,
): number {
  const blockHeight = estimateSignatureBlockHeight(doc, fonts, contract);
  let y = ensureSpace(doc, startY + SECTION_GAP, blockHeight);
  y += SECTION_GAP;

  doc.fontSize(10).font(fonts.bold).fillColor(COLORS.title).text("Unterschriften", PAGE.margin, y);
  y += SECTION_TITLE_HEIGHT;

  const signatureLineWidth = 220;

  doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text("NexAgency:", PAGE.margin, y);
  y += 12;
  doc
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.margin + signatureLineWidth, y)
    .strokeColor(COLORS.muted)
    .stroke();
  y += 6;

  if (contract.signed_by_agency && contract.agency_signed_at) {
    doc
      .fontSize(8)
      .font(fonts.regular)
      .fillColor(COLORS.muted)
      .text(
        `Digital bestätigt am ${formatDate(contract.agency_signed_at)}`,
        PAGE.margin,
        y,
      );
    y += measureTextHeight(
      doc,
      `Digital bestätigt am ${formatDate(contract.agency_signed_at)}`,
      8,
      fonts.regular,
    ) + 4;
  }

  y += 14;
  doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text("Vertragspartner:", PAGE.margin, y);
  y += 12;
  doc
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.margin + signatureLineWidth, y)
    .strokeColor(COLORS.muted)
    .stroke();
  y += 6;

  if (contract.signed_by_partner && contract.partner_signed_at) {
    doc
      .fontSize(8)
      .font(fonts.regular)
      .fillColor(COLORS.muted)
      .text(
        `Digital bestätigt am ${formatDate(contract.partner_signed_at)}`,
        PAGE.margin,
        y,
      );
    y += measureTextHeight(
      doc,
      `Digital bestätigt am ${formatDate(contract.partner_signed_at)}`,
      8,
      fonts.regular,
    );
  } else if (contract.signed_at) {
    doc
      .fontSize(8)
      .font(fonts.regular)
      .fillColor(COLORS.muted)
      .text(`Unterzeichnet am ${formatDate(contract.signed_at)}`, PAGE.margin, y);
    y += measureTextHeight(
      doc,
      `Unterzeichnet am ${formatDate(contract.signed_at)}`,
      8,
      fonts.regular,
    );
  }

  return y + 12;
}

export async function generateContractPdfBuffer(
  contract: ContractWithDetails,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: PAGE.margin });
  const fonts = registerInvoicePdfFonts(doc);
  const regular = fonts?.regular ?? "Helvetica";
  const bold = fonts?.bold ?? "Helvetica-Bold";
  const pdfFonts: PdfFonts = { regular, bold };

  let y: number = PAGE.margin;

  doc.fillColor(COLORS.accent).fontSize(18).font(bold).text(INVOICE_COMPANY.name, PAGE.margin, y);
  y += 22;
  doc.fontSize(8).font(regular).fillColor(COLORS.muted).text(INVOICE_COMPANY.street, PAGE.margin, y);
  y += 11;
  doc.text(`${INVOICE_COMPANY.postalCode} ${INVOICE_COMPANY.city}`, PAGE.margin, y);
  y += 11;
  doc.text(INVOICE_COMPANY.email, PAGE.margin, y);
  y += 16;

  const categoryLabel = CONTRACT_CATEGORY_LABELS[contract.contract_category];
  doc.fontSize(14).font(bold).fillColor(COLORS.title).text(categoryLabel, PAGE.margin, y);
  y += 18;

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

  y = appendRows(doc, pdfFonts, commonRows, y);

  if (contract.contract_category === "employee") {
    y = appendSection(doc, pdfFonts, "Mitarbeiter-Konditionen", [
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
    ], y, { gapBefore: SECTION_GAP });

    y = appendSection(doc, pdfFonts, "Zahlungs- & Steuerdaten", [
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
    ], y, { gapBefore: 2 });
  } else {
    y = appendSection(doc, pdfFonts, "Freelancer-Konditionen", [
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
    ], y, { gapBefore: SECTION_GAP });

    y = appendSection(doc, pdfFonts, "Zahlungs- & Steuerdaten", [
      ["Firma", formatMasterDataValue(contract.profile_business_name)],
      ["IBAN", formatMasterDataValue(contract.profile_iban)],
      ["BIC", formatMasterDataValue(contract.profile_bic)],
      ["Bank", formatMasterDataValue(contract.profile_bank_name)],
      ["Steuernummer", formatMasterDataValue(contract.profile_tax_number)],
      ["USt-ID", formatMasterDataValue(contract.profile_vat_id)],
    ], y, { gapBefore: 2 });
  }

  if (contract.notes?.trim()) {
    const notes = contract.notes.trim();
    const notesBlockHeight =
      SECTION_GAP + LABEL_HEIGHT + measureTextHeight(doc, notes, 9, regular) + ROW_GAP;
    y = ensureSpace(doc, y + SECTION_GAP, notesBlockHeight - SECTION_GAP);
    y += SECTION_GAP;
    doc.fontSize(8).font(regular).fillColor(COLORS.muted).text("Notizen:", PAGE.margin, y);
    y += LABEL_HEIGHT;
    doc.fontSize(9).font(regular).fillColor(COLORS.body);
    const notesHeight = measureTextHeight(doc, notes, 9, regular);
    doc.text(notes, PAGE.margin, y, { width: CONTENT_WIDTH });
    y += notesHeight + ROW_GAP;
  }

  y = appendSignatures(doc, pdfFonts, contract, y);

  const footerText = "Dieses Dokument wurde automatisch von NexAgency erstellt.";
  const footerHeight = measureTextHeight(doc, footerText, 8, regular) + 8;
  y = ensureSpace(doc, y + 8, footerHeight);
  y += 8;
  doc
    .fontSize(8)
    .font(regular)
    .fillColor(COLORS.muted)
    .text(footerText, PAGE.margin, y, { align: "center", width: CONTENT_WIDTH });

  return pdfToBuffer(doc);
}
