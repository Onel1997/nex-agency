"use client";

import { motion, useReducedMotion } from "framer-motion";
import { easePremium, scaleIn } from "@/lib/motion";
import { useMotionProfile } from "@/lib/useMotionProfile";
import { FloatingCard } from "./motion/FloatingCard";

const automations = [
  { name: "Lead-Qualifizierung", status: "live", progress: 100 },
  { name: "Content-Pipeline", status: "running", progress: 72 },
  { name: "CRM-Sync", status: "live", progress: 100 },
];

const metrics = [
  { label: "Automations", value: "24", delta: "+12%" },
  { label: "API Calls", value: "18.4k", delta: "+8%" },
  { label: "Uptime", value: "99.9%", delta: "stable" },
];

export function HeroPreview() {
  const reduced = useReducedMotion();
  const { full, lite } = useMotionProfile();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      transition={{ duration: lite ? 0.5 : 0.85, delay: lite ? 0.2 : 0.4, ease: easePremium }}
      className="relative mx-auto w-full max-w-xl lg:max-w-none lg:pt-4"
    >
      <FloatingCard>
        <div className="hero-preview-shell glass-card overflow-hidden rounded-2xl border border-white/[0.08]">
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500">
                <span className="text-[10px] font-bold text-white">N</span>
              </span>
              <div>
                <p className="text-[11px] font-semibold text-foreground">Nex Command</p>
                <p className="text-[9px] text-muted-soft">AI Operations · Live</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Operational
            </span>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-[1fr_0.85fr] sm:p-5">
            <div className="space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-violet-300/70">
                Active automations
              </p>
              {automations.map((item) => (
                <div
                  key={item.name}
                  className="rounded-xl border border-border/80 bg-white/[0.02] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-foreground/90">
                      {item.name}
                    </span>
                    <span
                      className={`text-[9px] font-medium uppercase tracking-wider ${
                        item.status === "live"
                          ? "text-cyan-300/90"
                          : "text-amber-300/90"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-violet-300/70">
                Platform metrics
              </p>
              <div className="grid grid-cols-3 gap-2">
                {metrics.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl border border-border/80 bg-white/[0.02] p-2.5 text-center"
                  >
                    <p className="text-[9px] text-muted-soft">{m.label}</p>
                    <p className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
                      {m.value}
                    </p>
                    <p className="mt-0.5 text-[8px] text-cyan-300/80">{m.delta}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FloatingCard>

      {full && !reduced && (
        <>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.6, ease: easePremium }}
            className="hero-float-chip absolute -right-1 top-12 hidden w-[11.5rem] rounded-xl border border-border/90 bg-surface-elevated/95 p-3 shadow-xl sm:block lg:-right-10"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-violet-300/75">
              Agent deployed
            </p>
            <p className="mt-2 text-[12px] font-semibold text-foreground">
              Lead-Routing v2.4
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              Qualifiziert Anfragen in unter 12s.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.85, duration: 0.6, ease: easePremium }}
            className="hero-float-chip absolute -left-1 bottom-6 hidden w-36 rounded-xl border border-border/90 bg-surface-elevated/95 p-3 shadow-xl sm:block lg:-left-12"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-violet-300/75">
              This week
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] gradient-text">
              +34%
            </p>
            <p className="mt-0.5 text-[10px] text-muted">Pipeline velocity</p>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
