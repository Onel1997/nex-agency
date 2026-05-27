"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeIn, revealTransition, viewport } from "@/lib/motion";

export function AnimatedSectionDivider() {
  const reduced = useReducedMotion();

  return (
    <div className="section-inner px-6 sm:px-8">
      <motion.div
        className="section-divider origin-center"
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        variants={reduced ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : fadeIn}
        transition={revealTransition(0)}
      />
    </div>
  );
}
