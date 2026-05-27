"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeIn, revealTransition, viewport } from "@/lib/motion";

export function AnimatedSectionDivider() {
  const reduced = useReducedMotion();

  return (
    <div className="section-transition" aria-hidden>
      <div className="section-inner">
        <motion.div
          className="section-divider-wrap"
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={
            reduced
              ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
              : fadeIn
          }
          transition={revealTransition(0)}
        >
          <div className="section-divider-glow" />
          <div className="section-divider" />
        </motion.div>
      </div>
    </div>
  );
}
