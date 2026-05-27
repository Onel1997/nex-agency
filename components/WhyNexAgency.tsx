"use client";

import { Brain, Gem, Target, Zap } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
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
      <div className="section-inner">
        <div className="grid items-start gap-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-24">
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

            <AnimatedSection delay={0.12} className="mt-12">
              <div className="glass-card rounded-2xl p-7 sm:p-8">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-violet-300/65">
                  Unser Versprechen
                </p>
                <ul className="mt-6 space-y-4">
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
            </AnimatedSection>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {reasons.map((reason, i) => (
              <AnimatedSection key={reason.title} delay={i * 0.08}>
                <div className="group glass-card rounded-2xl p-6 transition-all duration-300 hover:border-violet-500/18 hover:bg-surface-hover sm:p-7">
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
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
