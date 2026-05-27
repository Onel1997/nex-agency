"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Unified motion tier for performance:
 * - full: desktop pointer, motion allowed
 * - lite: mobile / coarse pointer — fewer effects, CSS-only hovers
 * - reduced: prefers-reduced-motion — minimal fades only
 */
export function useMotionProfile() {
  const reduced = useReducedMotion();
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [narrowViewport, setNarrowViewport] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const narrow = window.matchMedia("(max-width: 1023px)");

    const sync = () => {
      setCoarsePointer(coarse.matches);
      setNarrowViewport(narrow.matches);
    };

    sync();
    coarse.addEventListener("change", sync);
    narrow.addEventListener("change", sync);
    return () => {
      coarse.removeEventListener("change", sync);
      narrow.removeEventListener("change", sync);
    };
  }, []);

  const lite = !reduced && (coarsePointer || narrowViewport);

  return {
    reduced: !!reduced,
    lite,
    /** Full effects: desktop + motion OK */
    full: !reduced && !lite,
  };
}
