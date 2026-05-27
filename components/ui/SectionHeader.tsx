"use client";

import { type ReactNode } from "react";
import { AnimatedSection } from "../AnimatedSection";

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
  const alignClass =
    align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <AnimatedSection className={`max-w-3xl ${alignClass} ${className}`}>
      <p className="section-label">{label}</p>
      <h2 className="section-title mt-4">{title}</h2>
      {description && (
        <p className="section-description mt-5">{description}</p>
      )}
    </AnimatedSection>
  );
}
