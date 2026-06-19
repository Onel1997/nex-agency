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
const CONDITIONS_TO_PAYMENT_GAP = 12;
const PAYMENT_TO_SIGNATURES_GAP = 10;
const FOOTER_GAP = 10;
const SIGNATURE_LINE_WIDTH = 220;

const SIGNED_CONTRACT_STATUSES = new Set<ContractStatus>([
  "signed",
  "active",
  "terminated",
  "archived",
]);

const ACTIVE_CONTRACT_STATUSES = new Set<ContractStatus>([
  "active",
  "terminated",
  "archived",
]);

function resolveAgencySignatureNote(contract: ContractWithDetails): string | null {
  if (!SIGNED_CONTRACT_STATUSES.has(contract.status as ContractStatus)) return null;
  const signedAt = contract.agency_signed_at ?? contract.signed_at;
  return signedAt ? `Digital bestätigt am ${formatDate(signedAt)}` : null;
}

function resolvePartnerSignatureNote(contract: ContractWithDetails): string | null {
  if (!SIGNED_CONTRACT_STATUSES.has(contract.status as ContractStatus)) return null;
  const signedAt = contract.partner_signed_at ?? contract.signed_at;
  return signedAt ? `Digital bestätigt am ${formatDate(signedAt)}` : null;
}

function resolveActiveSinceNote(contract: ContractWithDetails): string | null {
  if (!ACTIVE_CONTRACT_STATUSES.has(contract.status as ContractStatus)) return null;
  return contract.activated_at
    ? `Vertrag aktiv seit ${formatDate(contract.activated_at)}`
    : null;
}

function measureNoteHeight(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  note: string | null,
  extraGap: number = 0,
): number {
  if (!note) return 0;
  return measureTextHeight(doc, note, 8, fonts.regular) + extraGap;
}

const COLORS = {
  title: "#111827",
  body: "#1f2937",
  muted: "#6b7280",
  accent: "#7c3aed",
} as const;

type PdfFonts = { regular: string; bold: string };
type PdfRow = [string, string];

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

function estimateRowsHeight(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  rows: PdfRow[],
): number {
  return rows.reduce((total, [, value]) => total + measureRowHeight(doc, fonts, value), 0);
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

function drawSectionTitle(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  title: string,
  y: number,
): number {
  doc.fontSize(10).font(fonts.bold).fillColor(COLORS.title).text(title, PAGE.margin, y);
  return y + SECTION_TITLE_HEIGHT;
}

function drawRows(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  rows: PdfRow[],
  startY: number,
): number {
  let y = startY;
  for (const [label, value] of rows) {
    doc.fontSize(8).font(fonts.regular).fillColor(COLORS.muted).text(`${label}:`, PAGE.margin, y);
    y += LABEL_HEIGHT;
    doc.fontSize(10).font(fonts.bold).fillColor(COLORS.body);
    const valueHeight = measureTextHeight(doc, value, 10, fonts.bold);
    doc.text(value, PAGE.margin, y, { width: CONTENT_WIDTH });
    y += valueHeight + ROW_GAP;
  }
  return y;
}

function appendRows(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  rows: PdfRow[],
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

function appendSection(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  title: string,
  rows: PdfRow[],
  startY: number,
  gapBefore: number = SECTION_GAP,
): number {
  const sectionHeight = gapBefore + SECTION_TITLE_HEIGHT + estimateRowsHeight(doc, fonts, rows);
  let y = ensureSpace(doc, startY, sectionHeight);
  y += gapBefore;
  y = drawSectionTitle(doc, fonts, title, y);
  return drawRows(doc, fonts, rows, y);
}

function estimateSignaturesHeight(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  contract: ContractWithDetails,
): number {
  const agencyNote = measureNoteHeight(doc, fonts, resolveAgencySignatureNote(contract), 4);
  const partnerNote = measureNoteHeight(doc, fonts, resolvePartnerSignatureNote(contract));
  const activeNote = measureNoteHeight(doc, fonts, resolveActiveSinceNote(contract), 8);

  return (
    SECTION_TITLE_HEIGHT +
    12 +
    6 +
    agencyNote +
    14 +
    12 +
    6 +
    partnerNote +
    activeNote
  );
}

function estimatePaymentSignatureBlockHeight(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  paymentRows: PdfRow[],
  contract: ContractWithDetails,
): number {
  return (
    SECTION_TITLE_HEIGHT +
    estimateRowsHeight(doc, fonts, paymentRows) +
    PAYMENT_TO_SIGNATURES_GAP +
    estimateSignaturesHeight(doc, fonts, contract)
  );
}

function drawSignatures(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  contract: ContractWithDetails,
  startY: number,
): number {
  let y = drawSectionTitle(doc, fonts, "Unterschriften", startY);

  doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text("NexAgency:", PAGE.margin, y);
  y += 12;
  doc
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.margin + SIGNATURE_LINE_WIDTH, y)
    .strokeColor(COLORS.muted)
    .stroke();
  y += 6;

  const agencyNote = resolveAgencySignatureNote(contract);
  if (agencyNote) {
    doc.fontSize(8).font(fonts.regular).fillColor(COLORS.muted).text(agencyNote, PAGE.margin, y);
    y += measureTextHeight(doc, agencyNote, 8, fonts.regular) + 4;
  }

  y += 14;
  doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body).text("Vertragspartner:", PAGE.margin, y);
  y += 12;
  doc
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.margin + SIGNATURE_LINE_WIDTH, y)
    .strokeColor(COLORS.muted)
    .stroke();
  y += 6;

  const partnerNote = resolvePartnerSignatureNote(contract);
  if (partnerNote) {
    doc.fontSize(8).font(fonts.regular).fillColor(COLORS.muted).text(partnerNote, PAGE.margin, y);
    y += measureTextHeight(doc, partnerNote, 8, fonts.regular);
  }

  const activeNote = resolveActiveSinceNote(contract);
  if (activeNote) {
    y += 8;
    doc.fontSize(8).font(fonts.bold).fillColor(COLORS.body).text(activeNote, PAGE.margin, y);
    y += measureTextHeight(doc, activeNote, 8, fonts.bold);
  }

  return y + 12;
}

function appendPaymentSignatureBlock(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  contract: ContractWithDetails,
  paymentRows: PdfRow[],
  startY: number,
): number {
  const blockHeight = estimatePaymentSignatureBlockHeight(doc, fonts, paymentRows, contract);
  const totalNeeded = CONDITIONS_TO_PAYMENT_GAP + blockHeight;

  let y = startY;
  if (y + totalNeeded > pageBottom(doc)) {
    doc.addPage();
    y = PAGE.margin;
  } else {
    y += CONDITIONS_TO_PAYMENT_GAP;
  }

  y = drawSectionTitle(doc, fonts, "Zahlungs- & Steuerdaten", y);
  y = drawRows(doc, fonts, paymentRows, y);
  y += PAYMENT_TO_SIGNATURES_GAP;
  y = drawSignatures(doc, fonts, contract, y);

  return y;
}

function appendNotes(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  notes: string,
  startY: number,
): number {
  const blockHeight =
    SECTION_GAP + LABEL_HEIGHT + measureTextHeight(doc, notes, 9, fonts.regular) + ROW_GAP;
  let y = ensureSpace(doc, startY, blockHeight);
  y += SECTION_GAP;
  doc.fontSize(8).font(fonts.regular).fillColor(COLORS.muted).text("Notizen:", PAGE.margin, y);
  y += LABEL_HEIGHT;
  doc.fontSize(9).font(fonts.regular).fillColor(COLORS.body);
  const notesHeight = measureTextHeight(doc, notes, 9, fonts.regular);
  doc.text(notes, PAGE.margin, y, { width: CONTENT_WIDTH });
  return y + notesHeight + ROW_GAP;
}

function appendFooter(
  doc: InstanceType<typeof PDFDocument>,
  fonts: PdfFonts,
  startY: number,
): number {
  const footerText = "Dieses Dokument wurde automatisch von NexAgency erstellt.";
  const footerHeight = FOOTER_GAP + measureTextHeight(doc, footerText, 8, fonts.regular);
  let y = ensureSpace(doc, startY, footerHeight);
  y += FOOTER_GAP;
  doc
    .fontSize(8)
    .font(fonts.regular)
    .fillColor(COLORS.muted)
    .text(footerText, PAGE.margin, y, { align: "center", width: CONTENT_WIDTH });
  return y;
}

function getPaymentRows(contract: ContractWithDetails): PdfRow[] {
  if (contract.contract_category === "employee") {
    return [
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
    ];
  }

  return [
    ["Firma", formatMasterDataValue(contract.profile_business_name)],
    ["IBAN", formatMasterDataValue(contract.profile_iban)],
    ["BIC", formatMasterDataValue(contract.profile_bic)],
    ["Bank", formatMasterDataValue(contract.profile_bank_name)],
    ["Steuernummer", formatMasterDataValue(contract.profile_tax_number)],
    ["USt-ID", formatMasterDataValue(contract.profile_vat_id)],
  ];
}

function getConditionsRows(contract: ContractWithDetails): PdfRow[] {
  if (contract.contract_category === "employee") {
    return [
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
    ];
  }

  return [
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
  ];
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

  const commonRows: PdfRow[] = [
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

  const conditionsTitle =
    contract.contract_category === "employee"
      ? "Mitarbeiter-Konditionen"
      : "Freelancer-Konditionen";

  y = appendSection(doc, pdfFonts, conditionsTitle, getConditionsRows(contract), y);

  if (contract.notes?.trim()) {
    y = appendNotes(doc, pdfFonts, contract.notes.trim(), y);
  }

  y = appendPaymentSignatureBlock(doc, pdfFonts, contract, getPaymentRows(contract), y);
  appendFooter(doc, pdfFonts, y);

  return pdfToBuffer(doc);
}
