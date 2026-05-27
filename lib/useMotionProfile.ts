"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

function readCoarsePointer() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(pointer: coarse)").matches;
}

function readNarrowViewport() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(max-width: 1023px)").matches;
}

/**
 * Unified motion tier for performance:
 * - full: desktop pointer, motion allowed
 * - lite: mobile / coarse pointer — fewer effects, CSS-only hovers
 * - reduced: prefers-reduced-motion — minimal fades only
 */
export function useMotionProfile() {
  const reduced = useReducedMotion();
  const [coarsePointer, setCoarsePointer] = useState(readCoarsePointer);
  const [narrowViewport, setNarrowViewport] = useState(readNarrowViewport);

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
