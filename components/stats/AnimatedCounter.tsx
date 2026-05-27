"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, useRef } from "react";
import { easePremium } from "@/lib/motion";

export type CounterFormat =
  | { kind: "plus"; end: number; unit?: string }
  | { kind: "decimal"; end: number; suffix: string }
  | { kind: "prefix"; prefix: string; end: number; suffix: string }
  | { kind: "percent"; end: number };

function formatValue(v: number, format: CounterFormat): string {
  if (format.kind === "plus") {
    const n = Math.round(v);
    return format.unit ? `${n}${format.unit}+` : `${n}+`;
  }
  if (format.kind === "decimal") return `${v.toFixed(1)}${format.suffix}`;
  if (format.kind === "percent") return `${Math.round(v)}%`;
  return `${format.prefix}${Math.round(v)}${format.suffix}`;
}

interface AnimatedCounterProps {
  format: CounterFormat;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({
  format,
  className = "",
  duration = 1.8,
}: AnimatedCounterProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => formatValue(v, format));

  useEffect(() => {
    if (!isInView) return;
    if (reduced) {
      motionValue.set(format.end);
      return;
    }
    const controls = animate(motionValue, format.end, {
      duration,
      ease: easePremium,
    });
    return () => controls.stop();
  }, [isInView, reduced, format, duration, motionValue]);

  if (reduced) {
    return (
      <span ref={ref} className={className}>
        {formatValue(format.end, format)}
      </span>
    );
  }

  return (
    <span ref={ref} className={className}>
      <motion.span>{display}</motion.span>
    </span>
  );
}
