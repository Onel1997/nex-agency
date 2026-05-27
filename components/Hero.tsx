"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  headerStagger,
  heroTransition,
  reducedStaggerItem,
  staggerItem,
} from "@/lib/motion";
import { Button } from "./ui/Button";
import { HeroPreview } from "./HeroPreview";
import { HeroBackground } from "./hero/HeroBackground";
import { HeroHeadline } from "./hero/HeroHeadline";
import { HeroPillars } from "./hero/HeroPillars";
import { HeroTrust } from "./hero/HeroTrust";

export function Hero() {
  const reduced = useReducedMotion();
  const itemVariants = reduced ? reducedStaggerItem : staggerItem;

  return (
    <section className="hero-section relative overflow-hidden">
      <HeroBackground />

      <div className="section-inner relative px-6 pb-28 sm:px-8 lg:pb-36">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 xl:gap-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={headerStagger}
            className="relative z-10 max-w-2xl lg:max-w-none xl:max-w-2xl"
          >
            <motion.div
              variants={itemVariants}
              transition={heroTransition(0)}
              className="hero-eyebrow"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/60 opacity-40" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" />
              </span>
              <span>KI-Automation · SaaS · Premium Web</span>
            </motion.div>

            <div className="mt-7 sm:mt-8">
              <HeroHeadline />
            </div>

            <motion.p
              variants={itemVariants}
              transition={heroTransition(0.22)}
              className="hero-lead-premium mt-7 max-w-xl sm:mt-8"
            >
              NexAgency entwickelt KI-Automationen, SaaS-Plattformen und
              conversion-starke Web-Erlebnisse — mit der Präzision einer
              Tech-Produktfirma und der Ästhetik einer Premium-Marke.
            </motion.p>

            <motion.div
              variants={itemVariants}
              transition={heroTransition(0.3)}
              className="mt-9 flex flex-col gap-3.5 sm:mt-10 sm:flex-row sm:items-center sm:gap-4"
            >
              <Button href="#contact" variant="primary" icon className="hero-cta-primary">
                Strategiegespräch buchen
              </Button>
              <Button href="#portfolio" variant="ghost" className="hero-cta-ghost">
                Referenzen ansehen
              </Button>
            </motion.div>

            <motion.p
              variants={itemVariants}
              transition={heroTransition(0.36)}
              className="cta-note mt-4"
            >
              Kostenlos · 30 Minuten · Unverbindlich
            </motion.p>

            <HeroTrust />
            <HeroPillars />
          </motion.div>

          <HeroPreview />
        </div>
      </div>
    </section>
  );
}
