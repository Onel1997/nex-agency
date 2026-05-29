"use client";

import { bookingLink } from "@/lib/contact";
import { useMotionProfile } from "@/lib/useMotionProfile";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  headerStagger,
  heroTransition,
  reducedStaggerItem,
  staggerItem,
} from "@/lib/motion";
import { useRef, type MouseEvent } from "react";
import { HeroPreview } from "./HeroPreview";
import { HeroBackground } from "./hero/HeroBackground";
import { HeroHeadline } from "./hero/HeroHeadline";
import { HeroPillars } from "./hero/HeroPillars";
import { HeroTrust } from "./hero/HeroTrust";

const HERO_BOOKING_URL = bookingLink;

const MAGNETIC_STRENGTH = 0.18;
const MAX_OFFSET = 6;

function HeroBookingButton() {
  const { full } = useMotionProfile();
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!full || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * MAGNETIC_STRENGTH;
    const y = (e.clientY - rect.top - rect.height / 2) * MAGNETIC_STRENGTH;
    const clampedX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, x));
    const clampedY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, y));
    ref.current.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0) scale(1.02)`;
  };

  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = "";
  };

  return (
    <a
      ref={ref}
      href={HERO_BOOKING_URL}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={full ? onMove : undefined}
      onMouseLeave={full ? onLeave : undefined}
      className="group magnetic-btn hero-cta-primary inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-0 btn-primary btn-primary-glow px-6 py-3.5 text-[14px] font-medium tracking-[-0.01em] text-white sm:px-7 sm:py-3.5"
    >
      Jetzt Erstgespräch sichern
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
    </a>
  );
}

function HeroEyebrow({ staticMode = false }: { staticMode?: boolean }) {
  const inner = (
    <>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/60 opacity-40" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" />
      </span>
      <span>KI-Automation · SaaS · Premium Web</span>
    </>
  );

  if (staticMode) {
    return <div className="hero-eyebrow">{inner}</div>;
  }

  return <motion.div className="hero-eyebrow">{inner}</motion.div>;
}

function HeroColumnStatic() {
  return (
    <div className="relative z-10 max-w-2xl lg:max-w-none xl:max-w-2xl">
      <HeroEyebrow staticMode />
      <div className="mt-7 sm:mt-8">
        <HeroHeadline />
      </div>
      <p className="hero-lead-premium mt-7 max-w-xl sm:mt-8">
        NexAgency entwickelt KI-Automationen, SaaS-Plattformen und conversion-starke
        Web-Erlebnisse — mit der Präzision einer Tech-Produktfirma und der Ästhetik
        einer Premium-Marke.
      </p>
      <div className="mt-9 sm:mt-10">
        <HeroBookingButton />
      </div>
      <p className="cta-note mt-4">Kostenlos · 30 Minuten · Unverbindlich</p>
      <HeroTrust />
      <HeroPillars />
    </div>
  );
}

function HeroColumnAnimated() {
  const reduced = useReducedMotion();
  const itemVariants = reduced ? reducedStaggerItem : staggerItem;

  return (
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
        NexAgency entwickelt KI-Automationen, SaaS-Plattformen und conversion-starke
        Web-Erlebnisse — mit der Präzision einer Tech-Produktfirma und der Ästhetik
        einer Premium-Marke.
      </motion.p>

      <motion.div
        variants={itemVariants}
        transition={heroTransition(0.3)}
        className="mt-9 sm:mt-10"
      >
        <HeroBookingButton />
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
  );
}

export function Hero() {
  const { skipEntrance } = useMotionProfile();

  return (
    <section className="hero-section relative overflow-hidden">
      <HeroBackground />

      <div className="section-inner relative px-6 pb-32 sm:px-8 sm:pb-36 lg:pb-40">
        <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-[4.5rem] xl:gap-20">
          {skipEntrance ? <HeroColumnStatic /> : <HeroColumnAnimated />}
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}
