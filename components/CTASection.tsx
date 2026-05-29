"use client";

import { Sparkles } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { RevealCard } from "./motion/RevealCard";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";
import { TrustBar } from "./TrustBar";
import { CONTACT_SECTION_ID } from "@/lib/contact";

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
  return (
    <section
      id={CONTACT_SECTION_ID}
      className="contact-section section-shell section-shell--cta"
      aria-labelledby="contact-heading"
    >
      <div className="section-inner relative z-[1]">
        <AnimatedSection>
          <div className="contact-section-header">
            <p className="section-label">Kontakt</p>
            <h2 id="contact-heading" className="section-title max-w-3xl">
              Bereit für Ihr{" "}
              <span className="gradient-text">nächstes Projekt</span>?
            </h2>
            <p className="section-description mt-5 max-w-2xl sm:mt-6">
              NexAgency begleitet lokale Marken und SaaS-Teams mit Premium-Design,
              KI-Systemen und messbarem Wachstum — persönlich, transparent und auf
              Anfrage ausgelegt.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.05} className="contact-cta-panel mt-12 sm:mt-14">
          <div className="contact-panel glass-card">
            <div className="contact-panel-body">
              <RevealCard lift={false} className="contact-intro-card">
                <div className="contact-panel-intro">
                  <span className="contact-intro-badge">
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    AI-native Agentur
                  </span>

                  <p className="contact-intro-lead">
                    Strategie, Design und KI — in einem Gespräch auf den Punkt
                    gebracht. Kein Sales-Druck, nur Klarheit für Ihr nächstes
                    digitales Projekt.
                  </p>

                  <p className="cta-note mt-6">
                    Kostenlos · Unverbindlich · Antwort innerhalb von 24 Stunden
                  </p>

                  <div className="mt-8">
                    <TrustBar />
                  </div>
                </div>
              </RevealCard>

              <RevealCard lift={false}>
                <div className="contact-process">
                  <p className="contact-process-label">So arbeiten wir zusammen</p>
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
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
