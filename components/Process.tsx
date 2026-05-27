"use client";

import { GradientGlow } from "./motion/GradientGlow";
import { RevealCard } from "./motion/RevealCard";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";
import { SectionHeader } from "./ui/SectionHeader";

const steps = [
  {
    number: "01",
    title: "Strategie",
    description:
      "Wir lernen Ihr Unternehmen, Ihre Zielgruppe und Ihre Ziele kennen — und legen die Seiten, Botschaften und Wege fest, die wirklich Anfragen bringen.",
  },
  {
    number: "02",
    title: "Design",
    description:
      "Individuelle Gestaltung und Markenrichtung, die Vertrauen schafft, Klarheit vermittelt und Ihren Anspruch widerspiegelt.",
  },
  {
    number: "03",
    title: "Launch",
    description:
      "Entwicklung, SEO-Grundlagen, Analytics und Qualitätssicherung — damit Ihre Website professionell, schnell und einsatzbereit online geht.",
  },
  {
    number: "04",
    title: "Wachstum",
    description:
      "KI-gestützter Content, Optimierungen und laufende Betreuung — damit Ihr digitaler Auftritt auch nach dem Go-live weiter an Bedeutung gewinnt.",
  },
];

export function Process() {
  return (
    <section id="process" className="section-shell">
      <GradientGlow
        variant="mixed"
        className="left-1/2 top-0 h-96 w-96 -translate-x-1/2 opacity-50"
      />

      <div className="section-inner">
        <SectionHeader
          label="Prozess"
          title={
            <>
              Vom Erstgespräch bis zum{" "}
              <span className="gradient-text">Go-live</span>
            </>
          }
          description="Vier klare Phasen, direkte Kommunikation und volle Transparenz — für Unternehmer, die wissen wollen, wohin die Reise geht."
        />

        <div className="relative mt-20 lg:mt-24">
          <div className="absolute left-6 top-8 hidden h-[calc(100%-4rem)] w-px bg-gradient-to-b from-violet-500/35 via-border to-transparent lg:hidden" />

          <StaggerGrid className="grid gap-5 lg:grid-cols-4 lg:gap-5">
            {steps.map((step) => (
              <StaggerItem key={step.title}>
                <RevealCard className="h-full">
                  <div className="group relative h-full glass-card rounded-2xl p-7 lg:p-8">
                    <div className="absolute left-6 top-8 hidden h-px w-[calc(100%+1.25rem)] bg-gradient-to-r from-violet-500/25 to-transparent lg:block lg:last:hidden" />

                    <div className="flex items-start gap-4 lg:block">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-500/10 ring-1 ring-white/[0.06] lg:mb-7">
                        <span className="text-sm font-semibold gradient-text">
                          {step.number}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold tracking-[-0.025em]">
                          {step.title}
                        </h3>
                        <p className="mt-3.5 text-[14px] leading-[1.75] text-muted">
                          {step.description}
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
