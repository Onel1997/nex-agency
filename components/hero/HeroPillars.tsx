"use client";

import { Bot, Layers, Sparkles, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  staggerContainerFast,
  staggerItem,
  reducedStaggerItem,
  heroTransition,
} from "@/lib/motion";
import { useMotionProfile } from "@/lib/useMotionProfile";

const pillars = [
  {
    icon: Bot,
    label: "KI-Automation",
    description: "Workflows, Agenten & intelligente Pipelines",
  },
  {
    icon: Layers,
    label: "SaaS-Entwicklung",
    description: "Skalierbare Plattformen & Produkt-UI",
  },
  {
    icon: Sparkles,
    label: "Premium Web Experiences",
    description: "Markenstarke, conversion-orientierte Sites",
  },
  {
    icon: TrendingUp,
    label: "Conversion-Systeme",
    description: "Funnels, Analytics & messbares Wachstum",
  },
];

export function HeroPillars() {
  const reduced = useReducedMotion();
  const { skipEntrance } = useMotionProfile();
  const item = reduced ? reducedStaggerItem : staggerItem;

  const gridClass = "mt-12 grid grid-cols-2 gap-2.5 sm:gap-3 lg:mt-14";

  const pillarCards = pillars.map((pillar, i) => {
    const card = (
      <div key={pillar.label} className="hero-pillar group">
          <div className="flex items-start gap-3">
            <span className="hero-pillar-icon">
              <pillar.icon className="h-3.5 w-3.5 text-violet-300" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-[-0.02em] text-foreground/95">
                {pillar.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-soft sm:text-[12px]">
                {pillar.description}
              </p>
            </div>
          </div>
      </div>
    );

    if (skipEntrance) return card;

    return (
      <motion.div
        key={pillar.label}
        variants={item}
        transition={heroTransition(0.52 + i * 0.06)}
        className="hero-pillar group"
      >
        <div className="flex items-start gap-3">
          <span className="hero-pillar-icon">
            <pillar.icon className="h-3.5 w-3.5 text-violet-300" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tracking-[-0.02em] text-foreground/95">
              {pillar.label}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-soft sm:text-[12px]">
              {pillar.description}
            </p>
          </div>
        </div>
      </motion.div>
    );
  });

  if (skipEntrance) {
    return <div className={gridClass}>{pillarCards}</div>;
  }

  return (
    <motion.div
      variants={staggerContainerFast}
      initial="hidden"
      animate="visible"
      className={gridClass}
    >
      {pillarCards}
    </motion.div>
  );
}
