"use client";

import { motion, useReducedMotion } from "framer-motion";
import { hoverLift } from "@/lib/motion";
import { useMotionProfile } from "@/lib/useMotionProfile";
import type { MouseEvent, ReactNode } from "react";
import { setSpotlightPosition } from "./SpotlightSurface";

interface RevealCardProps {
  children: ReactNode;
  className?: string;
  lift?: boolean;
  as?: "div" | "article";
  spotlight?: boolean;
}

export function RevealCard({
  children,
  className = "",
  lift = true,
  as = "div",
  spotlight = true,
}: RevealCardProps) {
  const reduced = useReducedMotion();
  const { full } = useMotionProfile();
  const Component = motion[as];
  const useSpotlight = spotlight && full;
  const useMotionLift = lift && full && !reduced;

  const onMove = (e: MouseEvent<HTMLElement>) => {
    if (useSpotlight) setSpotlightPosition(e.currentTarget, e.clientX, e.clientY);
  };

  const onLeave = (e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--spot-x", "50%");
    e.currentTarget.style.setProperty("--spot-y", "50%");
  };

  if (!useMotionLift) {
    const Tag = as;
    return (
      <Tag
        className={`premium-hover-card ${useSpotlight ? "spotlight-surface" : ""} card-hover-lift relative ${className}`}
        onMouseMove={useSpotlight ? onMove : undefined}
        onMouseLeave={useSpotlight ? onLeave : undefined}
      >
        {useSpotlight && (
          <>
            <span className="spotlight-surface-border" aria-hidden />
            <span className="spotlight-surface-glow" aria-hidden />
          </>
        )}
        <span className="premium-hover-glow" aria-hidden />
        {children}
      </Tag>
    );
  }

  return (
    <Component
      whileHover={hoverLift}
      className={`premium-hover-card ${useSpotlight ? "spotlight-surface" : ""} relative ${className}`}
      onMouseMove={useSpotlight ? onMove : undefined}
      onMouseLeave={useSpotlight ? onLeave : undefined}
    >
      {useSpotlight && (
        <>
          <span className="spotlight-surface-border" aria-hidden />
          <span className="spotlight-surface-glow" aria-hidden />
        </>
      )}
      <span className="premium-hover-glow" aria-hidden />
      {children}
    </Component>
  );
}
