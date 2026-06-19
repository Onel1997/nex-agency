import { NextResponse } from "next/server";
import { canAccessContractsRoutes } from "@/lib/auth/permissions";
import { getProfile } from "@/lib/auth/session";
import { generateContractPdfBuffer } from "@/lib/dashboard/contract-pdf";
import { getContractWithDetails } from "@/lib/dashboard/contracts";

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

  const pdfBuffer = await generateContractPdfBuffer(contract);

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
