"use client";

import { useMotionProfile } from "@/lib/useMotionProfile";
import { useEffect, useRef, useState } from "react";

const LERP = 0.14;
const IDLE_THRESHOLD = 0.75;

/** Desktop-only cursor effect — never mounts on touch / mobile viewports. */
export function CursorGlow() {
  const { full } = useMotionProfile();
  const [ready, setReady] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: -9999, y: -9999 });
  const current = useRef({ x: -9999, y: -9999 });
  const rafId = useRef<number | null>(null);
  const visible = useRef(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !full) return;

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      if (!visible.current && glowRef.current) {
        visible.current = true;
        glowRef.current.style.opacity = "1";
      }
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(tick);
      }
    };

    const onLeave = () => {
      visible.current = false;
      if (glowRef.current) glowRef.current.style.opacity = "0";
    };

    const tick = () => {
      const dx = target.current.x - current.current.x;
      const dy = target.current.y - current.current.y;

      if (Math.abs(dx) > IDLE_THRESHOLD || Math.abs(dy) > IDLE_THRESHOLD) {
        current.current.x += dx * LERP;
        current.current.y += dy * LERP;
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0)`;
        }
        rafId.current = requestAnimationFrame(tick);
      } else {
        current.current.x = target.current.x;
        current.current.y = target.current.y;
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0)`;
        }
        rafId.current = null;
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [ready, full]);

  if (!ready || !full) return null;

  return (
    <div className="cursor-glow-layer" aria-hidden>
      <div ref={glowRef} className="cursor-glow" />
    </div>
  );
}
