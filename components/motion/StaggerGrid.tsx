"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  reducedStaggerItem,
  staggerContainer,
  staggerContainerFast,
  staggerItem,
  viewport,
} from "@/lib/motion";
import type { ReactNode } from "react";

interface StaggerGridProps {
  children: ReactNode;
  className?: string;
  fast?: boolean;
}

export function StaggerGrid({
  children,
  className = "",
  fast = false,
}: StaggerGridProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={fast ? staggerContainerFast : staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={reduced ? reducedStaggerItem : staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  );
}
