import fs from "node:fs";
import path from "node:path";
import type PDFDocument from "pdfkit";

export const INVOICE_FONT_REGULAR = "InvoiceRegular";
export const INVOICE_FONT_BOLD = "InvoiceBold";

const FONT_FILES = {
  regular: "Inter-Regular.ttf",
  bold: "Inter-Bold.ttf",
} as const;

const FONT_DIR_CANDIDATES = [
  path.join(process.cwd(), "public", "fonts"),
  path.join(process.cwd(), "assets", "fonts"),
];

function resolveFontPath(fileName: string): string | null {
  for (const dir of FONT_DIR_CANDIDATES) {
    const candidate = path.join(dir, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export interface InvoicePdfFonts {
  regular: string;
  bold: string;
}

export function registerInvoicePdfFonts(doc: InstanceType<typeof PDFDocument>): InvoicePdfFonts | null {
  const regularPath = resolveFontPath(FONT_FILES.regular);
  if (!regularPath) return null;

  const boldPath = resolveFontPath(FONT_FILES.bold) ?? regularPath;

  // Load as Buffer so PDFKit does not depend on AFM files or fragile bundle paths.
  doc.registerFont(INVOICE_FONT_REGULAR, fs.readFileSync(regularPath));
  doc.registerFont(INVOICE_FONT_BOLD, fs.readFileSync(boldPath));
  doc.font(INVOICE_FONT_REGULAR);

  return {
    regular: INVOICE_FONT_REGULAR,
    bold: INVOICE_FONT_BOLD,
  };
}
