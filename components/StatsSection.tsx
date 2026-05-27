"use client";

import { Bot, Clock, Layers, TrendingUp, type LucideIcon } from "lucide-react";
import { GradientGlow } from "./motion/GradientGlow";
import { RevealCard } from "./motion/RevealCard";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";
import { AnimatedCounter, type CounterFormat } from "./stats/AnimatedCounter";

type Stat = {
  icon: LucideIcon;
  format: CounterFormat;
  label: string;
  accent: "violet" | "cyan" | "mixed";
};

const stats: Stat[] = [
  {
    icon: Bot,
    format: { kind: "plus", end: 50 },
    label: "KI-Workflows automatisiert",
    accent: "violet",
  },
  {
    icon: Layers,
    format: { kind: "plus", end: 15 },
    label: "SaaS & Web Launches",
    accent: "cyan",
  },
  {
    icon: TrendingUp,
    format: { kind: "decimal", end: 2.8, suffix: "x" },
    label: "Ø Conversion-Lift",
    accent: "mixed",
  },
  {
    icon: Clock,
    format: { kind: "prefix", prefix: "<", end: 48, suffix: "h" },
    label: "Erstantwort garantiert",
    accent: "violet",
  },
];

const accentRing: Record<Stat["accent"], string> = {
  violet: "from-violet-500/20 to-violet-600/5",
  cyan: "from-cyan-500/20 to-cyan-600/5",
  mixed: "from-violet-500/15 to-cyan-500/10",
};

function StatCard({ stat }: { stat: Stat }) {
  return (
    <RevealCard as="article" className="stat-card group h-full">
      <div className="stat-card-border-glow" aria-hidden />
      <div className="stat-card-blur" aria-hidden />

      <div className="stat-card-inner glass-card relative h-full rounded-2xl p-6 sm:p-7">
        <div
          className={`inline-flex rounded-xl bg-gradient-to-br ${accentRing[stat.accent]} p-2.5 ring-1 ring-white/[0.06]`}
        >
          <stat.icon className="h-4 w-4 text-violet-300" strokeWidth={2} />
        </div>

        <AnimatedCounter
          format={stat.format}
          className="stat-card-value mt-6 block"
        />

        <p className="stat-card-label mt-2">{stat.label}</p>
      </div>
    </RevealCard>
  );
}

export function StatsSection() {
  return (
    <section className="stats-section section-bridge relative" aria-label="Kennzahlen">
      <div className="stats-section-gradient absolute inset-0" aria-hidden />
      <GradientGlow
        variant="violet"
        className="left-1/2 top-1/2 h-64 w-[min(100%,44rem)] -translate-x-1/2 -translate-y-1/2 opacity-40"
      />

      <div className="section-inner relative">
        <StaggerGrid className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-5">
          {stats.map((stat) => (
            <StaggerItem key={stat.label}>
              <StatCard stat={stat} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      </div>
    </section>
  );
}
