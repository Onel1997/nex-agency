import { NextResponse } from "next/server";
import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { generateFreelancerInvoicePdfBuffer } from "@/lib/dashboard/freelancer-invoice-pdf";
import { getFreelancerInvoiceWithDetails } from "@/lib/dashboard/freelancer-invoices";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  if (!canAccessFinanceRoutes(profile)) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id } = await context.params;
  const invoice = await getFreelancerInvoiceWithDetails(id);

  if (!invoice) {
    return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });
  }

  const pdfBuffer = await generateFreelancerInvoicePdfBuffer(invoice);
  const filename = `${invoice.invoice_number}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
