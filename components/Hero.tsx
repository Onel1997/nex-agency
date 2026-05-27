"use client";

import { motion } from "framer-motion";
import { Button } from "./ui/Button";
import { HeroPreview } from "./HeroPreview";
import { TrustBar } from "./TrustBar";

const industries = [
  "Gesundheit",
  "Fitness",
  "Recht",
  "Gastronomie",
  "Handwerk",
  "Beratung",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32 lg:min-h-[92vh] lg:pt-36">
      <div className="aurora absolute inset-0" />
      <div className="glow-orb -left-48 top-[-8rem] h-[32rem] w-[32rem] bg-violet-600/22" />
      <div className="glow-orb glow-orb-sm -right-24 top-24 h-96 w-96 bg-cyan-400/12" />
      <div className="glow-orb glow-orb-sm left-1/3 bottom-0 h-64 w-64 bg-violet-500/8" />
      <div className="grid-pattern absolute inset-0" />
      <div className="noise-overlay absolute inset-0" />

      <div className="section-inner relative px-6 pb-24 sm:px-8 lg:pb-32">
        <div className="grid items-center gap-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-20 xl:gap-24">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-violet-500/15 bg-violet-500/[0.06] px-4 py-2 backdrop-blur-sm"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/70 opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </span>
              <span className="text-[12px] font-medium tracking-wide text-violet-200/80">
                Digitale Agentur für den deutschen Mittelstand
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
              className="hero-display mt-8"
            >
              Ihr digitaler Auftritt —{" "}
              <span className="gradient-text">würdig Ihrer Marke</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.16 }}
              className="hero-lead mt-7 max-w-xl"
            >
              Wir entwickeln Premium-Websites, KI-gestützte Content-Systeme und
              Wachstumsstrategien für Unternehmen in Ihrer Region — persönlich
              betreut, klar strukturiert und auf echte Anfragen ausgelegt.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.24 }}
              className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"
            >
              <Button href="#contact" variant="primary" icon>
                Erstgespräch vereinbaren
              </Button>
              <Button href="#portfolio" variant="secondary">
                Referenzprojekte ansehen
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.3 }}
              className="cta-note mt-4"
            >
              Kostenlos · 30 Minuten · Unverbindlich
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.36 }}
              className="mt-10"
            >
              <TrustBar />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.42 }}
              className="mt-12 border-t border-border/80 pt-8"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-soft">
                Branchen, die wir begleiten
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {industries.map((industry) => (
                  <span
                    key={industry}
                    className="rounded-full border border-border/80 bg-white/[0.02] px-3 py-1.5 text-[12px] text-muted transition-colors duration-200 hover:border-violet-500/20 hover:text-foreground/90"
                  >
                    {industry}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          <HeroPreview />
        </div>
      </div>
    </section>
  );
}
