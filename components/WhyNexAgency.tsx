"use client";

import { Brain, Gem, Target, Zap } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { GradientGlow } from "./motion/GradientGlow";
import { RevealCard } from "./motion/RevealCard";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";
import { SectionHeader } from "./ui/SectionHeader";

const reasons = [
  {
    icon: Brain,
    title: "KI mit Augenmaß",
    description:
      "Wir setzen KI gezielt für Recherche, Entwürfe und schnellere Iteration ein — und verfeinern jedes Ergebnis mit Strategie und Design-Kompetenz.",
  },
  {
    icon: Gem,
    title: "Premium als Selbstverständlichkeit",
    description:
      "Ihre Website soll genauso überzeugen wie Ihre Leistung vor Ort: klare Struktur, starke Typografie, durchdachte Details.",
  },
  {
    icon: Target,
    title: "Auf Anfragen ausgelegt",
    description:
      "Jede Seite führt Besucher zuverlässig weiter — von der Leistungsdarstellung bis zur Termin- oder Kontaktanfrage.",
  },
  {
    icon: Zap,
    title: "Umsetzung mit Fokus",
    description:
      "Klare Meilensteine, direkter Draht und ein Prozess für Unternehmer, die Qualität und Tempo gleichermaßen erwarten.",
  },
];

const principles = [
  "Keine unnötigen Retainer — nur Leistungen, die Sie wirklich brauchen",
  "Festpreis und Scope vor dem ersten Design-Entwurf",
  "SEO-Grundlagen und Analytics ab dem ersten Tag",
  "Jeder Inhalt wird vor Veröffentlichung geprüft",
];

export function WhyNexAgency() {
  return (
    <section id="why" className="section-shell">
      <GradientGlow
        variant="cyan"
        className="right-0 top-1/3 h-64 w-64 opacity-35"
      />

      <div className="section-inner">
        <div className="grid items-start gap-14 sm:gap-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20 xl:gap-24">
          <div>
            <SectionHeader
              align="left"
              label="Ansatz"
              title={
                <>
                  Agenturarbeit auf{" "}
                  <span className="gradient-text">Premium-Niveau</span>
                </>
              }
              description="NexAgency vereint Design, KI-Systeme und Wachstum — für lokale Unternehmen in Deutschland, die online ernst genommen werden wollen und planbar neue Kunden gewinnen möchten."
            />

            <AnimatedSection delay={0.1} className="mt-10 sm:mt-12">
              <RevealCard lift={false}>
                <div className="glass-card rounded-2xl p-7 sm:p-8">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-violet-300/65">
                    Unser Versprechen
                  </p>
                  <ul className="mt-5 space-y-3.5 sm:mt-6 sm:space-y-4">
                    {principles.map((principle) => (
                      <li
                        key={principle}
                        className="flex items-start gap-3 text-[15px] leading-[1.75] text-muted"
                      >
                        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" />
                        {principle}
                      </li>
                    ))}
                  </ul>
                </div>
              </RevealCard>
            </AnimatedSection>
          </div>

          <StaggerGrid className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-1">
            {reasons.map((reason) => (
              <StaggerItem key={reason.title}>
                <RevealCard className="h-full">
                  <div className="group h-full glass-card rounded-2xl p-6 sm:p-7">
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-500/10 ring-1 ring-white/[0.05]">
                        <reason.icon className="h-5 w-5 text-violet-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold tracking-[-0.015em]">
                          {reason.title}
                        </h3>
                        <p className="mt-2.5 text-[14px] leading-[1.75] text-muted">
                          {reason.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </RevealCard>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </div>
    </section>
  );
}
