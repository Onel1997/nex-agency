"use client";

import type { MouseEvent, ReactNode } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { GradientGlow } from "./motion/GradientGlow";
import { RevealCard } from "./motion/RevealCard";
import { setSpotlightPosition } from "./motion/SpotlightSurface";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
import { ProjectTags } from "./ProjectTags";

type Project = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  tags: string[];
  image: string;
  location: string;
  wide?: boolean;
};

const featuredFriseur: Project = {
  id: "friseur-hero",
  name: "Friseur Partnach",
  subtitle: "Premium-Friseursalon · München",
  description:
    "Kompletter Website-Relaunch für einen etablierten Friseursalon im Münchner Süden — mit Premium-Hero, Online-Terminbuchung, transparenter Preisgestaltung und vertrauensstarken Bewertungen.",
  tags: ["Webdesign", "Local Business", "Premium UI", "Branding", "Booking", "Conversion"],
  image: "/friseurpartnach/friseurprojekt.png",
  location: "München",
};

const friseurProjects: Project[] = [
  {
    id: "friseur-services",
    name: "Friseur Partnach",
    subtitle: "Leistungen & Markenauftritt",
    description:
      "Elegante Leistungsseite mit klarer Struktur, Premium-Typografie und Fokus auf Handwerk, Vertrauen und Buchungsabsicht.",
    tags: ["Webdesign", "Premium UI", "Branding", "Conversion"],
    image: "/friseurpartnach/friseurprojekt0.png",
    location: "München",
  },
  {
    id: "friseur-booking",
    name: "Friseur Partnach",
    subtitle: "Online-Terminbuchung",
    description:
      "Nahtlose Treatwell-Integration mit Service-Auswahl, Preistransparenz und einem Buchungsflow bis zur Bestätigung.",
    tags: ["Booking", "Conversion", "Local Business", "Premium UI"],
    image: "/friseurpartnach/friseurprojekt3.png",
    location: "München",
    wide: true,
  },
  {
    id: "friseur-pricing",
    name: "Friseur Partnach",
    subtitle: "Preisliste & Transparenz",
    description:
      "Übersichtliche Preisstruktur für Damen, Herren und Kinder — klar, seriös und ohne Hürden für neue Kundinnen und Kunden.",
    tags: ["Webdesign", "Local Business", "Conversion", "Premium UI"],
    image: "/friseurpartnach/friseurprojekt1.png",
    location: "München",
  },
  {
    id: "friseur-reviews",
    name: "Friseur Partnach",
    subtitle: "Bewertungen & Social Proof",
    description:
      "Google- und Treatwell-Bewertungen prominent platziert — damit Besucher sofort Vertrauen aufbauen.",
    tags: ["Conversion", "Local Business", "Branding", "Premium UI"],
    image: "/friseurpartnach/friseurprojekt10.png",
    location: "München",
  },
  {
    id: "friseur-contact",
    name: "Friseur Partnach",
    subtitle: "Kontakt & Anfahrt",
    description:
      "Lokale Auffindbarkeit mit Öffnungszeiten, Anruf-CTA und Google Maps — optimiert für Kunden in der Umgebung.",
    tags: ["Local Business", "Webdesign", "Conversion", "Premium UI"],
    image: "/friseurpartnach/friseurprojekt11.png",
    location: "München",
  },
];

const featuredNexTrends: Project = {
  id: "nextrends-dashboard",
  name: "NexTrends",
  subtitle: "Creator Dashboard · AI SaaS",
  description:
    "Zentrales Dashboard für Creator und Marketer: Trends, Content-Pipeline und Performance auf einen Blick — gebaut als skalierbare AI SaaS-Plattform mit Premium-UI und klarer Produktlogik.",
  tags: ["AI SaaS", "Dashboard", "Creator Tools", "Automation", "OpenAI"],
  image: "/nextrends/dashboard.png",
  location: "SaaS",
};

const nexTrendsProjects: Project[] = [
  {
    id: "nextrends-trends",
    name: "NexTrends",
    subtitle: "Trend Intelligence",
    description:
      "KI-gestützte Trendanalyse mit Signalen, Relevanz-Scores und Handlungsempfehlungen — damit Creator früh erkennen, was als Nächstes performt.",
    tags: ["AI SaaS", "Analytics", "Automation", "OpenAI", "Creator Tools"],
    image: "/nextrends/trend-intelligence.png",
    location: "SaaS",
    wide: true,
  },
  {
    id: "nextrends-video",
    name: "NexTrends",
    subtitle: "AI Video Studio",
    description:
      "Video-Erstellung aus Trends und Briefings: Skript, Schnitt-Vorschläge und Export-Workflows in einer modernen Creator-Oberfläche.",
    tags: ["AI SaaS", "Creator Tools", "Automation", "OpenAI"],
    image: "/nextrends/video-studio.png",
    location: "SaaS",
  },
  {
    id: "nextrends-analyzer",
    name: "NexTrends",
    subtitle: "Landing Page Analyzer",
    description:
      "Automatisierte Analyse von Landingpages mit Conversion-Hinweisen, Struktur-Feedback und Marketing-Optimierungen für schnellere Iteration.",
    tags: ["AI SaaS", "Automation", "Analytics", "Creator Tools"],
    image: "/nextrends/landing-page-analyzer.png",
    location: "SaaS",
  },
  {
    id: "nextrends-hooks",
    name: "NexTrends",
    subtitle: "Hook Generator",
    description:
      "KI-generierte Hooks und Opening-Lines für Short-Form-Content — abgestimmt auf Zielgruppe, Plattform und aktuelle Trend-Signale.",
    tags: ["AI SaaS", "Creator Tools", "OpenAI", "Automation"],
    image: "/nextrends/hook-generator.png",
    location: "SaaS",
  },
  {
    id: "nextrends-pricing",
    name: "NexTrends",
    subtitle: "Pricing & Pläne",
    description:
      "Transparente Preisgestaltung mit klaren Feature-Tiers — designed für Vertrauen, Upgrade-Pfade und eine professionelle SaaS-Conversion.",
    tags: ["AI SaaS", "Stripe", "Conversion", "Dashboard"],
    image: "/nextrends/pricing.png",
    location: "SaaS",
  },
  {
    id: "nextrends-checkout",
    name: "NexTrends",
    subtitle: "Stripe Checkout",
    description:
      "Sicherer Checkout-Flow mit Stripe-Integration, klaren Zahlungsoptionen und einem reibungslosen Abschluss für Abonnements und Upgrades.",
    tags: ["Stripe", "AI SaaS", "Conversion", "Automation"],
    image: "/nextrends/stripe-checkout.png",
    location: "SaaS",
  },
  {
    id: "nextrends-admin-analytics",
    name: "NexTrends",
    subtitle: "Admin Analytics",
    description:
      "Admin-Dashboard mit Nutzungsmetriken, Trend-Performance und Plattform-KPIs — für datenbasierte Produkt- und Wachstumsentscheidungen.",
    tags: ["Admin Panel", "Analytics", "AI SaaS", "Dashboard"],
    image: "/nextrends/admin-trends.png",
    location: "SaaS",
  },
  {
    id: "nextrends-admin-controls",
    name: "NexTrends",
    subtitle: "Admin Controls",
    description:
      "Zentrale Steuerung für Nutzer, Features und Systemeinstellungen — übersichtlich, sicher und für den operativen SaaS-Betrieb gebaut.",
    tags: ["Admin Panel", "AI SaaS", "Automation", "Analytics"],
    image: "/nextrends/admin-controll.png",
    location: "SaaS",
  },
];

function handleSpotlightMove(e: MouseEvent<HTMLElement>) {
  setSpotlightPosition(e.currentTarget, e.clientX, e.clientY);
}

function handleSpotlightLeave(e: MouseEvent<HTMLElement>) {
  e.currentTarget.style.setProperty("--spot-x", "50%");
  e.currentTarget.style.setProperty("--spot-y", "50%");
}

function ProjectCard({
  project,
  featured = false,
}: {
  project: Project;
  featured?: boolean;
}) {
  return (
    <article
      className={`portfolio-card spotlight-surface premium-hover-card group rounded-2xl border border-border/80 ${
        project.wide ? "lg:col-span-2" : ""
      }`}
      onMouseMove={handleSpotlightMove}
      onMouseLeave={handleSpotlightLeave}
    >
      <span className="spotlight-surface-border" aria-hidden />
      <span className="spotlight-surface-glow" aria-hidden />
      <span className="premium-hover-glow" aria-hidden />
      <div className="portfolio-border-glow" aria-hidden />
      <div className="portfolio-glow" aria-hidden />
      <div className="portfolio-reflection" aria-hidden />

      <div className="portfolio-card-inner">
        <div
          className={`portfolio-image-wrap relative ${
            featured ? "aspect-[16/8] sm:aspect-[16/7]" : "aspect-[16/10]"
          }`}
        >
          <div className="browser-chrome absolute inset-x-0 top-0 z-10 flex items-center gap-2 px-3 py-2.5">
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
              <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
              <span className="h-2 w-2 rounded-full bg-[#28c840]" />
            </div>
            <div className="mx-auto h-4 w-full max-w-[120px] rounded bg-white/[0.06] sm:max-w-[180px]" />
          </div>

          <div className="absolute inset-0 top-[34px] bg-[#0a0a0a]">
            <Image
              src={project.image}
              alt={`${project.name} — ${project.subtitle}`}
              fill
              className="object-cover object-top"
              sizes={
                featured
                  ? "100vw"
                  : project.wide
                    ? "(max-width: 1024px) 100vw, 66vw"
                    : "(max-width: 1024px) 100vw, 50vw"
              }
              priority={featured}
            />
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-surface/25 to-transparent transition-opacity duration-500 group-hover:via-surface/15 ${
                featured ? "opacity-95" : "opacity-90"
              }`}
            />
          </div>
        </div>

        <div
          className={`border-t border-border/60 bg-surface-elevated/90 ${
            featured ? "p-7 sm:p-9" : "p-6 sm:p-7"
          }`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={`font-semibold tracking-[-0.025em] transition-colors duration-400 group-hover:text-foreground ${
                  featured ? "text-2xl sm:text-[1.65rem]" : "text-lg"
                }`}
              >
                {project.name}
              </h3>
              <span className="rounded-full border border-border/80 bg-white/[0.03] px-2.5 py-0.5 text-[10px] text-muted-soft transition-colors duration-400 group-hover:border-violet-500/25 group-hover:text-muted">
                {project.location}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] font-medium text-violet-300/75 transition-colors duration-400 group-hover:text-violet-300/90">
              {project.subtitle}
            </p>
          </div>

          <p
            className={`mt-4 leading-[1.75] text-muted transition-colors duration-400 group-hover:text-muted/95 ${
              featured ? "max-w-3xl text-base sm:text-[17px]" : "text-[14px]"
            }`}
          >
            {project.description}
          </p>

          <ProjectTags tags={project.tags} />

          <span className="portfolio-case-study">
            View Case Study
            <ArrowUpRight className="portfolio-case-study-icon h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}

function PortfolioBlock({
  label,
  title,
  description,
  featured,
  projects,
}: {
  label: string;
  title: ReactNode;
  description: string;
  featured: Project;
  projects: Project[];
}) {
  return (
    <div className="space-y-6 sm:space-y-7">
      <SectionHeader
        align="left"
        label={label}
        title={title}
        description={description}
        className="max-w-3xl"
      />

      <StaggerGrid className="grid gap-6 sm:gap-7 lg:grid-cols-2">
        <StaggerItem className="lg:col-span-2">
          <ProjectCard project={featured} featured />
        </StaggerItem>
        {projects.map((project) => (
          <StaggerItem
            key={project.id}
            className={project.wide ? "lg:col-span-2" : ""}
          >
            <ProjectCard project={project} />
          </StaggerItem>
        ))}
      </StaggerGrid>
    </div>
  );
}

export function Portfolio() {
  return (
    <section id="portfolio" className="section-shell">
      <GradientGlow
        variant="cyan"
        className="right-0 top-1/4 h-[28rem] w-[28rem]"
      />
      <GradientGlow
        variant="violet"
        className="-left-24 bottom-0 h-80 w-80 opacity-80"
      />

      <div className="section-inner">
        <SectionHeader
          label="Referenzprojekte"
          title={
            <>
              Echte Arbeit für{" "}
              <span className="gradient-text">lokale Marken & SaaS</span>
            </>
          }
          description="Ausgewählte Projekte mit echten Screenshots — von Premium-Websites für den deutschen Mittelstand bis zu KI-gestützten SaaS-Plattformen."
        />

        <div className="mt-20 space-y-24 sm:space-y-28">
          <PortfolioBlock
            label="Local Business"
            title={
              <>
                Friseur Partnach —{" "}
                <span className="gradient-text">Premium vor Ort</span>
              </>
            }
            description="Website-Relaunch für einen etablierten Friseursalon in München: Vertrauen, Terminbuchung und lokale Sichtbarkeit in einem durchgängigen digitalen Erlebnis."
            featured={featuredFriseur}
            projects={friseurProjects}
          />

          <div className="section-divider" />

          <PortfolioBlock
            label="AI SaaS Plattform"
            title={
              <>
                NexTrends —{" "}
                <span className="gradient-text">KI für Creator & Marketing</span>
              </>
            }
            description="AI Creator SaaS für Trendanalyse, KI-Video-Erstellung und Marketing Automation — von Dashboard und Content-Tools bis zu Pricing, Checkout und Admin-Bereich."
            featured={featuredNexTrends}
            projects={nexTrendsProjects}
          />
        </div>

        <AnimatedSection delay={0.15} className="mt-20">
          <RevealCard lift={false}>
          <div className="glass-card flex flex-col items-center justify-between gap-6 rounded-2xl px-6 py-8 text-center sm:flex-row sm:px-10 sm:text-left">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-violet-300/65">
                Ihr Projekt als Nächstes?
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.02em] sm:text-xl">
                Lokal stark auftreten — oder SaaS skalierbar bauen.
              </p>
              <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">
                Ob Friseursalon, Praxis oder KI-Produkt: Wir entwickeln digitale
                Erlebnisse, die vertrauenswürdig wirken und messbar Ergebnisse liefern.
              </p>
            </div>
            <Button href="#contact" variant="primary" icon className="shrink-0">
              Projekt besprechen
            </Button>
          </div>
          </RevealCard>
        </AnimatedSection>
      </div>
    </section>
  );
}
