"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeUp, reducedFadeUp, revealTransition, viewport } from "@/lib/motion";
import { useMotionProfile } from "@/lib/useMotionProfile";
import type { ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: AnimatedSectionProps) {
  const reduced = useReducedMotion();
  const { skipEntrance } = useMotionProfile();

  return (
    <motion.div
      initial={skipEntrance ? false : "hidden"}
      whileInView="visible"
      viewport={viewport}
      variants={reduced ? reducedFadeUp : fadeUp}
      transition={revealTransition(delay)}
      className={className}
    >
      {children}
    </motion.div>
  );
}
