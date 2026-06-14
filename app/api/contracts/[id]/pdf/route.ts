import { NextResponse } from "next/server";
import { canAccessContractsRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { CONTRACT_PDFS_BUCKET } from "@/lib/dashboard/contracts";
import { generateContractPdfBuffer } from "@/lib/dashboard/contract-pdf";
import { getContractWithDetails } from "@/lib/dashboard/contracts";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  if (!canAccessContractsRoutes(profile)) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id } = await context.params;
  const contract = await getContractWithDetails(id);

  if (!contract) {
    return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
  }

  let pdfBuffer: Buffer;

  if (contract.pdf_url && !contract.pdf_url.startsWith("/api/")) {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(CONTRACT_PDFS_BUCKET)
      .download(contract.pdf_url);

    if (!error && data) {
      pdfBuffer = Buffer.from(await data.arrayBuffer());
    } else {
      pdfBuffer = await generateContractPdfBuffer(contract);
    }
  } else {
    pdfBuffer = await generateContractPdfBuffer(contract);
  }

  const filename = `${contract.contract_number}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
