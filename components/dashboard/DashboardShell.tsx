import { DashboardSidebar } from "./DashboardSidebar";
import type { Profile } from "@/lib/auth/types";

interface DashboardShellProps {
  children: React.ReactNode;
  profile: Profile;
}

export function DashboardShell({ children, profile }: DashboardShellProps) {
  return (
    <div className="dashboard-shell relative flex min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.08)_0%,_transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(34,211,238,0.05)_0%,_transparent_45%)]"
        aria-hidden
      />

      <DashboardSidebar profile={profile} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
