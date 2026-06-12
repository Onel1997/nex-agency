import { notFound } from "next/navigation";
import { FreelancerDetailPageClient } from "@/components/dashboard/FreelancerDetailPageClient";
import { getFreelancerDetailData } from "@/lib/dashboard/freelancers";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FreelancerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getFreelancerDetailData(id);

  if (!data) notFound();

  return <FreelancerDetailPageClient data={data} />;
}
