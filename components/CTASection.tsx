"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { CalBookingEmbed } from "./contact/CalBookingEmbed";
import { GradientGlow } from "./motion/GradientGlow";
import { RevealCard } from "./motion/RevealCard";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";
import { TrustBar } from "./TrustBar";
import { BOOKING_SECTION_ID, bookingLink } from "@/lib/contact";
import { easePremium, viewport } from "@/lib/motion";

const bookingCtaPrimaryClass =
  "magnetic-btn group relative z-20 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-0 text-[14px] font-medium tracking-[-0.01em] btn-primary btn-primary-glow px-6 py-3.5 text-white sm:px-7 sm:py-3.5";

const bookingCtaSecondaryClass =
  "magnetic-btn relative z-20 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-0 text-[14px] font-medium tracking-[-0.01em] btn-secondary px-6 py-3.5 text-foreground/90 sm:px-7 sm:py-3.5";

const processSteps = [
  {
    step: "01",
    title: "Kurzes Kennenlernen",
    description:
      "Sie schildern Unternehmen, Ziele und wo Ihr digitaler Auftritt heute steht.",
  },
  {
    step: "02",
    title: "Klare Empfehlung",
    description:
      "Wir zeigen Umfang, Zeitplan und die sinnvolle Kombination aus Design, KI und Wachstum.",
  },
  {
    step: "03",
    title: "Nächster Schritt — ohne Druck",
    description:
      "Sie erhalten einen konkreten Vorschlag. Die Entscheidung liegt ganz bei Ihnen.",
  },
];

export function CTASection() {
  const reduced = useReducedMotion();

  const copyVariants = reduced
    ? undefined
    : {
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: easePremium },
        },
      };

  return (
    <section
      id={BOOKING_SECTION_ID}
      className="contact-section booking-section section-shell section-shell--cta"
      aria-labelledby="booking-heading"
    >
      <div className="booking-section-ambient" aria-hidden>
        <GradientGlow
          variant="mixed"
          className="booking-ambient-glow booking-ambient-glow--violet"
        />
        <GradientGlow
          variant="cyan"
          className="booking-ambient-glow booking-ambient-glow--cyan"
        />
      </div>

      <div className="section-inner relative z-[1]">
        <AnimatedSection>
          <div className="contact-section-header booking-section-header">
            <p className="section-label">Buchung & Kontakt</p>
            <h2 id="booking-heading" className="section-title max-w-3xl">
              Ihr{" "}
              <span className="gradient-text">kostenloses Erstgespräch</span> —
              in Minuten geplant
            </h2>
            <p className="section-description mt-5 max-w-2xl sm:mt-6">
              Buchen Sie direkt über Cal.com — 30 Minuten Strategiegespräch,
              kostenlos und unverbindlich. NexAgency begleitet lokale Marken und
              SaaS-Teams mit Premium-Design, KI-Systemen und messbarem Wachstum.
            </p>
          </div>
        </AnimatedSection>

        <motion.div
          className="booking-contact-block section-stack-lg"
          variants={copyVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <RevealCard lift={false} className="booking-copy-card">
            <div className="booking-copy-card-inner glass-card">
              <span className="booking-copy-badge">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                AI-native Agentur
              </span>

              <p className="booking-copy-lead">
                Strategie, Design und KI — in einem Gespräch auf den Punkt
                gebracht. Kein Sales-Druck, nur Klarheit für Ihr nächstes
                digitales Projekt.
              </p>

              <div className="booking-copy-actions contact-cta-row mt-6">
                <a
                  href={bookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={bookingCtaPrimaryClass}
                >
                  Jetzt Erstgespräch sichern
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </a>
                <a
                  href={bookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={bookingCtaSecondaryClass}
                >
                  Termin buchen
                </a>
              </div>

              <p className="cta-note mt-4">
                Kostenlos · Unverbindlich · Antwort innerhalb von 24 Stunden
              </p>

              <div className="mt-8">
                <TrustBar />
              </div>
            </div>
          </RevealCard>
        </motion.div>

        <AnimatedSection delay={0.05} className="section-stack-lg">
          <CalBookingEmbed />
        </AnimatedSection>

        <AnimatedSection delay={0.08} className="section-stack-lg">
          <RevealCard lift={false}>
            <div className="contact-process glass-card booking-process">
              <p className="contact-process-label">Ablauf des Erstgesprächs</p>
              <StaggerGrid className="contact-process-steps">
                {processSteps.map((item) => (
                  <StaggerItem key={item.step}>
                    <div className="contact-process-step">
                      <span className="contact-process-num">{item.step}</span>
                      <div>
                        <h3 className="contact-process-title">{item.title}</h3>
                        <p className="contact-process-desc">{item.description}</p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGrid>
            </div>
          </RevealCard>
        </AnimatedSection>
      </div>
    </section>
  );
}
