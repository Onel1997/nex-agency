"use client";

import { useMotionProfile } from "@/lib/useMotionProfile";
import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** Disables Framer Motion work on touch — keeps first scroll instant on iOS Safari. */
export function TouchScrollRoot({ children }: { children: ReactNode }) {
  const { lite } = useMotionProfile();

  return (
    <MotionConfig reducedMotion={lite ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}
