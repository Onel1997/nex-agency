import { CursorGlow } from "@/components/cursor/CursorGlow";
import { ScrollBehavior } from "@/components/ScrollBehavior";
import { TouchScrollRoot } from "@/components/TouchScrollRoot";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TouchScrollRoot>
      <ScrollBehavior />
      <CursorGlow />
      {children}
    </TouchScrollRoot>
  );
}
