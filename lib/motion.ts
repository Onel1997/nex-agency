import type { Transition, Variants } from "framer-motion";

/** Premium easing — Linear / Apple–style deceleration */
export const easePremium = [0.16, 1, 0.3, 1] as const;
export const easeSmooth = [0.21, 0.47, 0.32, 0.98] as const;

/** Standard scroll-reveal duration (0.7s–1s) */
export const REVEAL_DURATION = 0.75;

export const viewport = {
  once: true,
  margin: "0px 0px -6% 0px",
  amount: 0.12,
} as const;

/** Scroll reveal: opacity + y only (GPU-friendly, no blur) */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

export const fadeUpSoft: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/** Hero / preview entrance — transform + opacity only */
export const scaleIn: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: easePremium },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: REVEAL_DURATION,
      ease: easePremium,
    },
  },
};

export const headerStagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.03,
    },
  },
};

export const headerItem: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: REVEAL_DURATION,
      ease: easePremium,
    },
  },
};

export function revealTransition(delay = 0): Transition {
  return {
    duration: REVEAL_DURATION,
    delay,
    ease: easePremium,
  };
}

export function heroTransition(delay = 0): Transition {
  return {
    duration: 0.75,
    delay,
    ease: easeSmooth,
  };
}

export const floatTransition = {
  duration: 5.5,
  repeat: Infinity,
  ease: "easeInOut",
} as const;

export const reducedFadeUp: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

export const reducedStaggerItem: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

/** Subtle hover lift for interactive cards */
export const hoverLift = {
  y: -5,
  transition: { duration: 0.4, ease: easePremium },
};
