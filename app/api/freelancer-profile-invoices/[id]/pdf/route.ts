import { NextResponse } from "next/server";
import { canAccessFinanceRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { FREELANCER_INVOICE_PDFS_BUCKET } from "@/lib/dashboard/freelancer-profiles";
import { generateFreelancerProfileInvoicePdfBuffer } from "@/lib/dashboard/freelancer-profile-invoice-pdf";
import { getFreelancerProfileInvoiceWithDetails } from "@/lib/dashboard/freelancer-profile-invoices";
import { createClient } from "@/lib/supabase/server";

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
  const invoice = await getFreelancerProfileInvoiceWithDetails(id);

  if (!invoice) {
    return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });
  }

  let pdfBuffer: Buffer;

  if (invoice.pdf_url && !invoice.pdf_url.startsWith("/api/")) {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(FREELANCER_INVOICE_PDFS_BUCKET)
      .download(invoice.pdf_url);

    if (!error && data) {
      pdfBuffer = Buffer.from(await data.arrayBuffer());
    } else {
      pdfBuffer = await generateFreelancerProfileInvoicePdfBuffer(invoice);
    }
  } else {
    pdfBuffer = await generateFreelancerProfileInvoicePdfBuffer(invoice);
  }

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
