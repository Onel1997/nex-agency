"use client";

import { motion, useReducedMotion } from "framer-motion";
import { fadeIn, revealTransition, viewport } from "@/lib/motion";
import { useMotionProfile } from "@/lib/useMotionProfile";

export function AnimatedSectionDivider() {
  const reduced = useReducedMotion();
  const { skipEntrance } = useMotionProfile();

  return (
    <div className="section-transition" aria-hidden>
      <div className="section-inner">
        <motion.div
          className="section-divider-wrap"
          initial={skipEntrance ? false : "hidden"}
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
