import { NextResponse } from "next/server";
import { canAccessClient } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { generateInvoicePdfBuffer } from "@/lib/dashboard/invoice-pdf";
import { getInvoiceWithDetails } from "@/lib/dashboard/invoices";
import { getClientById } from "@/lib/dashboard/clients";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await context.params;
  const scopedClientId = new URL(request.url).searchParams.get("clientId");
  const invoice = await getInvoiceWithDetails(id);

  if (!invoice) {
    return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });
  }

  if (scopedClientId && invoice.client_id !== scopedClientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await getClientById(invoice.client_id);
  if (
    !client ||
    !canAccessClient(profile, client.responsible_member_id, {
      setterId: client.setter_id,
      closerId: client.closer_id,
    })
  ) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const pdfBuffer = await generateInvoicePdfBuffer(invoice);
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
