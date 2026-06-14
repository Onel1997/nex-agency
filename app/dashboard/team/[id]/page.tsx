import { notFound } from "next/navigation";
import { requireManagement } from "@/lib/auth/session";
import { getTeamMemberDetailData } from "@/lib/dashboard/contracts";
import { TeamMemberDetailPageClient } from "@/components/dashboard/TeamMemberDetailPageClient";

interface TeamMemberPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamMemberDetailPage({ params }: TeamMemberPageProps) {
  await requireManagement();
  const { id } = await params;
  const data = await getTeamMemberDetailData(id);

  if (!data) notFound();

  return <TeamMemberDetailPageClient data={data} />;
}
