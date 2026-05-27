"use client";

import { useMotionProfile } from "@/lib/useMotionProfile";
import type { ReactNode } from "react";

interface FloatingCardProps {
  children: ReactNode;
  className?: string;
}

/** CSS-only float on desktop; static on mobile for performance */
export function FloatingCard({ children, className = "" }: FloatingCardProps) {
  const { full } = useMotionProfile();

  return (
    <div className={`${full ? "float-card" : ""} ${className}`}>{children}</div>
  );
}
