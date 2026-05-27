"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BOOKING_EMBED_URL } from "@/lib/contact";
import { easePremium, viewport } from "@/lib/motion";
const EMBED_TITLE = "NexAgency — Kostenloses Strategiegespräch buchen";

export function CalBookingEmbed() {
  const reduced = useReducedMotion();
  const shellRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px 0px", threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const panelVariants = reduced
    ? undefined
    : {
        hidden: { opacity: 0, y: 28 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.75, ease: easePremium },
        },
      };

  return (
    <motion.div
      className="cal-embed-section"
      variants={panelVariants}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      aria-labelledby="cal-embed-heading"
    >
      <div className="cal-embed-header">
        <div className="cal-embed-header-copy">
          <p className="cal-embed-eyebrow">
            <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Live-Terminbuchung
          </p>
          <h3 id="cal-embed-heading" className="cal-embed-title">
            Kostenloses Strategiegespräch buchen
          </h3>
          <p className="cal-embed-description">
            Wählen Sie einen passenden Termin und lassen Sie uns über Ihr Projekt
            sprechen.
          </p>
        </div>
      </div>

      <div ref={shellRef} className="cal-embed-shell glass-card">
        <span className="cal-embed-shell-glow" aria-hidden />
        <span className="cal-embed-shell-border" aria-hidden />

        <div className="cal-embed-frame-wrap">
          {isVisible ? (
            <iframe
              src={BOOKING_EMBED_URL}
              title={EMBED_TITLE}
              className="cal-embed-frame"
              loading="lazy"
              allow="camera; microphone; autoplay; clipboard-write"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="cal-embed-skeleton" aria-hidden>
              <div className="cal-embed-skeleton-bar cal-embed-skeleton-bar--wide" />
              <div className="cal-embed-skeleton-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="cal-embed-skeleton-cell" />
                ))}
              </div>
              <div className="cal-embed-skeleton-bar cal-embed-skeleton-bar--medium" />
              <div className="cal-embed-skeleton-bar cal-embed-skeleton-bar--short" />
            </div>
          )}
        </div>
      </div>

      <p className="cal-embed-footnote">
        Powered by Cal.com · 30 Minuten · Google Meet · Europe/Berlin
      </p>
    </motion.div>
  );
}
