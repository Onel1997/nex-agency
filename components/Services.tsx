"use client";

import { ArrowUpRight, Bot, Globe, HeadphonesIcon, Palette } from "lucide-react";
import { GradientGlow } from "./motion/GradientGlow";
import { RevealCard } from "./motion/RevealCard";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";
import { SectionHeader } from "./ui/SectionHeader";

const services = [
  {
    icon: Globe,
    title: "Premium-Webdesign",
    description:
      "Individuelle Websites für Ihre Marke und Ihre Kunden — durchdacht bis zur Anfrage, nicht von der Stange.",
    tags: ["Maßgeschneidert", "Mobil optimiert", "Anfrage-stark"],
    accent: "from-violet-500/15 to-violet-600/5",
    iconColor: "text-violet-300",
  },
  {
    icon: Bot,
    title: "KI-Content-Systeme",
    description:
      "Strukturierte Inhalte für Blog, Leistungsseiten und lokales SEO — sichtbar bleiben, ohne den Alltag zu verlieren.",
    tags: ["SEO-Texte", "Social Media", "Redaktionsplan"],
    accent: "from-cyan-500/15 to-cyan-600/5",
    iconColor: "text-cyan-300",
  },
  {
    icon: Palette,
    title: "Branding & Wachstum",
    description:
      "Visuelle Identität und Botschaften, die Ihr Unternehmen glaubwürdig, hochwertig und unverwechselbar positionieren.",
    tags: ["Markenauftritt", "Landingpages", "Positionierung"],
    accent: "from-fuchsia-500/15 to-fuchsia-600/5",
    iconColor: "text-fuchsia-300",
  },
  {
    icon: HeadphonesIcon,
    title: "Monatlicher Support",
    description:
      "Updates, Performance-Checks und laufende Verbesserungen — weil ein starker Auftritt dauerhaft gepflegt werden will.",
    tags: ["Website-Pflege", "Analytics", "Fortlaufende Optimierung"],
    accent: "from-emerald-500/15 to-emerald-600/5",
    iconColor: "text-emerald-300",
  },
];

export function Services() {
  return (
    <section id="services" className="section-shell">
      <GradientGlow
        variant="violet"
        className="left-1/2 top-0 h-80 w-80 -translate-x-1/2"
      />

      <div className="section-inner">
        <SectionHeader
          label="Leistungen"
          title={
            <>
              Alles für Ihr Wachstum —{" "}
              <span className="gradient-text">aus einer Hand</span>
            </>
          }
          description="Webdesign, KI und Strategie als zusammenhängendes System — damit lokale Unternehmen online premium wirken und planbar Anfragen erhalten."
        />

        <StaggerGrid className="mt-20 grid gap-5 lg:grid-cols-2 lg:gap-6">
          {services.map((service) => (
            <StaggerItem key={service.title}>
              <RevealCard as="article" className="card-shine h-full">
                <div className="group glass-card h-full rounded-2xl p-8 sm:p-9">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`inline-flex rounded-xl bg-gradient-to-br ${service.accent} p-3 ring-1 ring-white/[0.05]`}
                    >
                      <service.icon className={`h-5 w-5 ${service.iconColor}`} />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-soft transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-300" />
                  </div>

                  <h3 className="mt-7 text-xl font-semibold tracking-[-0.025em]">
                    {service.title}
                  </h3>
                  <p className="mt-3.5 text-[15px] leading-[1.75] text-muted">
                    {service.description}
                  </p>

                  <div className="mt-7 flex flex-wrap gap-2">
                    {service.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border/80 bg-white/[0.02] px-2.5 py-1 text-[11px] text-muted-soft transition-colors duration-300 group-hover:border-violet-500/15"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </RevealCard>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </div>
    </section>
  );
}
