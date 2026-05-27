"use client";

import { useMotionProfile } from "@/lib/useMotionProfile";
import { GradientGlow } from "../motion/GradientGlow";

const particles = [
  { left: "12%", top: "22%", size: 2 },
  { left: "68%", top: "28%", size: 1.5 },
  { left: "42%", top: "62%", size: 2 },
  { left: "82%", top: "55%", size: 1.5 },
  { left: "28%", top: "78%", size: 1.5 },
];

export function HeroBackground() {
  const { full, reduced } = useMotionProfile();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="hero-gradient-mesh absolute inset-0" />
      <div className="aurora aurora--hero absolute inset-0" />

      {full && (
        <>
          <div className="hero-ambient-blob hero-ambient-blob-violet hero-blob-drift-a" />
          <div className="hero-ambient-blob hero-ambient-blob-cyan hero-blob-drift-b" />
        </>
      )}

      <GradientGlow
        variant="violet"
        className="gradient-glow--hero -left-[20%] top-[-15%] h-[42rem] w-[42rem]"
      />
      {!reduced && (
        <GradientGlow
          variant="cyan"
          className="gradient-glow--hero -right-[10%] top-[5%] hidden h-[36rem] w-[36rem] lg:block"
        />
      )}

      <div className={`hero-grid-fine absolute inset-0 ${full ? "hero-grid-drift" : ""}`} />
      <div className="grid-pattern absolute inset-0 opacity-80" />
      <div className="hero-vignette absolute inset-0" />
      <div className="noise-overlay absolute inset-0" />

      {full &&
        particles.map((p, i) => (
          <span
            key={i}
            className="hero-particle hero-particle-drift absolute rounded-full bg-white/50"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}

      <div className="hero-light-beam absolute left-1/2 top-0 h-[55vh] w-[min(90vw,52rem)] -translate-x-1/2" />
    </div>
  );
}
