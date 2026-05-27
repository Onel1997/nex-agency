"use client";

import { useMotionProfile } from "@/lib/useMotionProfile";

type GlowVariant = "violet" | "cyan" | "mixed";

interface GradientGlowProps {
  className?: string;
  variant?: GlowVariant;
  /** Pulse animation — desktop only, off by default for performance */
  animate?: boolean;
}

const variantClasses: Record<GlowVariant, string> = {
  violet: "gradient-glow-violet",
  cyan: "gradient-glow-cyan",
  mixed: "gradient-glow-mixed",
};

/** Static gradient orb — no JS animation (GPU-friendly) */
export function GradientGlow({
  className = "",
  variant = "mixed",
  animate = false,
}: GradientGlowProps) {
  const { full } = useMotionProfile();
  const pulse = animate && full;

  return (
    <div
      className={`gradient-glow pointer-events-none absolute ${variantClasses[variant]} ${pulse ? "gradient-glow-pulse" : ""} ${className}`}
      aria-hidden
    />
  );
}
