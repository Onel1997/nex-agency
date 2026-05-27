"use client";

import { useReducedMotion } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";

interface SpotlightSurfaceProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "article";
}

export function setSpotlightPosition(
  el: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const rect = el.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  el.style.setProperty("--spot-x", `${x}%`);
  el.style.setProperty("--spot-y", `${y}%`);
}

export function SpotlightSurface({
  children,
  className = "",
  as = "div",
}: SpotlightSurfaceProps) {
  const reduced = useReducedMotion();
  const Component = as;

  const onMove = (e: MouseEvent<HTMLElement>) => {
    setSpotlightPosition(e.currentTarget, e.clientX, e.clientY);
  };

  const onLeave = (e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--spot-x", "50%");
    e.currentTarget.style.setProperty("--spot-y", "50%");
  };

  return (
    <Component
      className={`spotlight-surface ${className}`}
      onMouseMove={reduced ? undefined : onMove}
      onMouseLeave={reduced ? undefined : onLeave}
    >
      <span className="spotlight-surface-border" aria-hidden />
      <span className="spotlight-surface-glow" aria-hidden />
      {children}
    </Component>
  );
}
