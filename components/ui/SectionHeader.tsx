"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import {
  headerItem,
  headerStagger,
  reducedStaggerItem,
  viewport,
} from "@/lib/motion";

interface SectionHeaderProps {
  label: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  label,
  title,
  description,
  align = "center",
  className = "",
}: SectionHeaderProps) {
  const reduced = useReducedMotion();
  const alignClass =
    align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <motion.header
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={headerStagger}
      className={`max-w-3xl ${alignClass} ${className}`}
    >
      <motion.p
        variants={reduced ? reducedStaggerItem : headerItem}
        className="section-label"
      >
        {label}
      </motion.p>
      <motion.h2
        variants={reduced ? reducedStaggerItem : headerItem}
        className="section-title mt-4"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          variants={reduced ? reducedStaggerItem : headerItem}
          className="section-description mt-5"
        >
          {description}
        </motion.p>
      )}
    </motion.header>
  );
}
