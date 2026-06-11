import { requireFinanceAccess } from "@/lib/auth/session";
import { FinanceSubNav } from "@/components/dashboard/FinanceSubNav";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFinanceAccess();

  return (
    <div className="space-y-6">
      <FinanceSubNav />
      {children}
    </div>
  );
}
