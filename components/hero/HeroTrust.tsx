"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Shield } from "lucide-react";
import { heroTransition, staggerItem, reducedStaggerItem } from "@/lib/motion";

const badges = [
  "DSGVO-konform",
  "Made in Germany",
  "Enterprise-ready",
  "Festpreis-Modelle",
];

const avatars = ["MK", "SR", "JL", "AP"];

export function HeroTrust() {
  const reduced = useReducedMotion();
  const item = reduced ? reducedStaggerItem : staggerItem;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={item}
      transition={heroTransition(0.42)}
      className="mt-8 space-y-5"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        {badges.map((badge) => (
          <span key={badge} className="hero-trust-badge">
            <Check className="h-3 w-3 text-cyan-400/90" strokeWidth={2.5} />
            {badge}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex -space-x-2">
          {avatars.map((initials, i) => (
            <span
              key={initials}
              className="hero-avatar flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold text-foreground/90"
              style={{ zIndex: avatars.length - i }}
            >
              {initials}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <Shield className="h-3.5 w-3.5 text-violet-400/80" />
          <span>
            Vertraut von{" "}
            <span className="font-medium text-foreground/90">lokalen Marken & SaaS-Teams</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}
