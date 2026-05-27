"use client";

import { motion, useReducedMotion } from "framer-motion";
import { easePremium, headerStagger, reducedStaggerItem, staggerItem } from "@/lib/motion";

const lineOne = ["KI,", "die", "arbeitet."];
const lineTwo = ["Produkte,", "die"];
const lineTwoAccent = "wachsen.";

export function HeroHeadline() {
  const reduced = useReducedMotion();
  const word = reduced ? reducedStaggerItem : staggerItem;

  return (
    <motion.h1
      variants={headerStagger}
      initial="hidden"
      animate="visible"
      className="hero-display-premium"
    >
      <span className="block">
        {lineOne.map((w, i) => (
          <motion.span
            key={`l1-${w}`}
            variants={word}
            transition={{ duration: 0.85, delay: 0.08 + i * 0.06, ease: easePremium }}
            className="hero-word inline-block"
          >
            {w}&nbsp;
          </motion.span>
        ))}
      </span>
      <span className="mt-1 block sm:mt-2">
        {lineTwo.map((w, i) => (
          <motion.span
            key={`l2-${w}`}
            variants={word}
            transition={{ duration: 0.85, delay: 0.32 + i * 0.06, ease: easePremium }}
            className="hero-word inline-block text-foreground/95"
          >
            {w}&nbsp;
          </motion.span>
        ))}
        <motion.span
          variants={word}
          transition={{ duration: 0.9, delay: 0.5, ease: easePremium }}
          className="hero-word gradient-text inline-block"
        >
          {lineTwoAccent}
        </motion.span>
      </span>
    </motion.h1>
  );
}
