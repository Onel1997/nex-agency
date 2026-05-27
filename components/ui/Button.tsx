"use client";

import { bookingLink } from "@/lib/contact";
import { useMotionProfile } from "@/lib/useMotionProfile";
import { ArrowRight } from "lucide-react";
import { useRef, type MouseEvent } from "react";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  icon?: boolean;
  glow?: boolean;
  className?: string;
}

const MAGNETIC_STRENGTH = 0.18;
const MAX_OFFSET = 6;

export function Button({
  children,
  variant = "primary",
  icon = false,
  glow = false,
  className = "",
}: ButtonProps) {
  const { full } = useMotionProfile();
  const ref = useRef<HTMLAnchorElement>(null);

  const base =
    "magnetic-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-0 text-[14px] font-medium tracking-[-0.01em]";

  const variants = {
    primary: "btn-primary px-6 py-3.5 text-white sm:px-7 sm:py-3.5",
    secondary:
      "btn-secondary px-6 py-3.5 text-foreground/90 sm:px-7 sm:py-3.5",
    ghost: "btn-ghost px-6 py-3.5 text-foreground/85 sm:px-7 sm:py-3.5",
  };

  const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!full || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * MAGNETIC_STRENGTH;
    const y = (e.clientY - rect.top - rect.height / 2) * MAGNETIC_STRENGTH;
    const clampedX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, x));
    const clampedY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, y));
    ref.current.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0) scale(1.02)`;
  };

  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = "";
  };

  return (
    <a
      ref={ref}
      href={bookingLink}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={full ? onMove : undefined}
      onMouseLeave={full ? onLeave : undefined}
      className={`group ${base} ${variants[variant]} ${glow ? "btn-primary-glow" : ""} ${className}`}
    >
      {children}
      {icon && (
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      )}
    </a>
  );
}
