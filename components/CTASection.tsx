"use client";

import { Calendar, Mail, MessageSquare } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { GradientGlow } from "./motion/GradientGlow";
import { RevealCard } from "./motion/RevealCard";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";
import { Button } from "./ui/Button";
import { TrustBar } from "./TrustBar";

const steps = [
  {
    icon: MessageSquare,
    title: "Kurzes Kennenlernen",
    description:
      "Sie schildern Ihr Unternehmen, Ihre Ziele und wo Ihr digitaler Auftritt heute steht.",
  },
  {
    icon: Calendar,
    title: "Klare Empfehlung",
    description:
      "Wir zeigen Ihnen Umfang, Zeitplan und die sinnvolle Kombination aus Design, KI und Wachstum.",
  },
  {
    icon: Mail,
    title: "Nächster Schritt — ohne Druck",
    description:
      "Sie erhalten einen konkreten Vorschlag. Entscheidung liegt ganz bei Ihnen.",
  },
];

export function CTASection() {
  return (
    <section id="contact" className="section-shell section-shell--cta">
      <div className="section-inner">
        <AnimatedSection>
          <RevealCard lift={false} className="overflow-hidden rounded-[1.75rem]">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border-strong">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/12 via-surface-elevated to-cyan-500/6" />
              <GradientGlow
                variant="mixed"
                className="left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 opacity-30"
              />
              <div className="grid-pattern absolute inset-0 opacity-35" />
              <div className="noise-overlay absolute inset-0" />

              <div className="relative grid gap-12 px-6 py-16 sm:px-10 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-20 lg:px-14 lg:py-24">
                <div>
                  <p className="section-label">Projekt anfragen</p>
                  <h2 className="section-title max-w-xl">
                    Bereit für einen Auftritt, dem{" "}
                    <span className="gradient-text">Kunden vertrauen</span>?
                  </h2>
                  <p className="mt-5 max-w-lg text-[16px] leading-[1.78] text-muted sm:mt-6 sm:text-[17px]">
                    In 30 Minuten klären wir, ob und wie NexAgency Ihr Unternehmen
                    online stärken kann — ob Website, Marke oder KI-Content für
                    lokales SEO.
                  </p>

                  <div className="mt-9 flex flex-col gap-3.5 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
                    <Button href="mailto:hello@nexagency.com" variant="primary" icon>
                      Jetzt Erstgespräch sichern
                    </Button>
                    <a
                      href="mailto:hello@nexagency.com"
                      className="text-[14px] text-muted transition-colors duration-300 hover:text-foreground"
                    >
                      hello@nexagency.com
                    </a>
                  </div>

                  <p className="cta-note mt-4">
                    Kostenlos · Unverbindlich · Antwort innerhalb von 24 Stunden
                  </p>

                  <div className="mt-8">
                    <TrustBar />
                  </div>
                </div>

                <div className="glass-card glass-card--hover rounded-2xl p-7 sm:p-8">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-violet-300/65">
                    Ablauf des Erstgesprächs
                  </p>
                  <StaggerGrid fast className="mt-7 space-y-6">
                    {steps.map((step, i) => (
                      <StaggerItem key={step.title}>
                        <div className="flex gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                            <step.icon className="h-4 w-4 text-violet-300" />
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-muted-soft">
                              Schritt {i + 1}
                            </p>
                            <h3 className="mt-0.5 font-semibold tracking-[-0.01em]">
                              {step.title}
                            </h3>
                            <p className="mt-2 text-[14px] leading-[1.75] text-muted">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerGrid>
                </div>
              </div>
            </div>
          </RevealCard>
        </AnimatedSection>
      </div>
    </section>
  );
}
