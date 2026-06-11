import { notFound } from "next/navigation";
import { FreelancerDetailPageClient } from "@/components/dashboard/FreelancerDetailPageClient";
import { getFreelancerById } from "@/lib/dashboard/freelancers";
import { getFreelancerInvoicesByFreelancerId } from "@/lib/dashboard/freelancer-invoices";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FreelancerDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [freelancer, invoices] = await Promise.all([
    getFreelancerById(id),
    getFreelancerInvoicesByFreelancerId(id),
  ]);

  if (!freelancer) notFound();

  return (
    <FreelancerDetailPageClient freelancer={freelancer} invoices={invoices} />
  );
}
