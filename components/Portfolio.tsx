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
  summary: string;
  tags: string[];
  image: string;
  location: string;
};

const featuredFriseur: Project = {
  id: "friseur-hero",
  name: "Friseur Partnach",
  subtitle: "Premium-Friseursalon · München",
  description:
    "Kompletter Website-Relaunch für einen etablierten Friseursalon im Münchner Süden — mit Premium-Hero, Online-Terminbuchung, transparenter Preisgestaltung und vertrauensstarken Bewertungen.",
  summary:
    "Kompletter Website-Relaunch mit Premium-Hero, Terminbuchung und vertrauensstarken Bewertungen.",
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
    summary: "Leistungsseite mit Premium-Typografie und klarer Buchungsabsicht.",
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
    summary: "Treatwell-Integration mit Service-Auswahl und transparentem Buchungsflow.",
    tags: ["Booking", "Conversion", "Local Business", "Premium UI"],
    image: "/friseurpartnach/friseurprojekt3.png",
    location: "München",
  },
  {
    id: "friseur-pricing",
    name: "Friseur Partnach",
    subtitle: "Preisliste & Transparenz",
    description:
      "Übersichtliche Preisstruktur für Damen, Herren und Kinder — klar, seriös und ohne Hürden für neue Kundinnen und Kunden.",
    summary: "Übersichtliche Preisstruktur für Damen, Herren und Kinder.",
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
    summary: "Google- und Treatwell-Bewertungen für sofortiges Vertrauen.",
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
    summary: "Öffnungszeiten, Anruf-CTA und Maps für lokale Auffindbarkeit.",
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
  summary:
    "Zentrales Creator-Dashboard für Trends, Content-Pipeline und Performance.",
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
    summary: "KI-Trendanalyse mit Signalen, Scores und Handlungsempfehlungen.",
    tags: ["AI SaaS", "Analytics", "Automation", "OpenAI", "Creator Tools"],
    image: "/nextrends/trend-intelligence.png",
    location: "SaaS",
  },
  {
    id: "nextrends-video",
    name: "NexTrends",
    subtitle: "AI Video Studio",
    description:
      "Video-Erstellung aus Trends und Briefings: Skript, Schnitt-Vorschläge und Export-Workflows in einer modernen Creator-Oberfläche.",
    summary: "Video aus Trends und Briefings — Skript, Schnitt und Export.",
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
    summary: "Automatisierte Landingpage-Analyse mit Conversion-Feedback.",
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
    summary: "KI-Hooks für Short-Form — Zielgruppe, Plattform und Trends.",
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
    summary: "Transparente Feature-Tiers für Vertrauen und Upgrades.",
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
    summary: "Stripe-Checkout mit klaren Zahlungsoptionen und Upgrade-Flow.",
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
    summary: "Admin-Metriken, Trend-Performance und Plattform-KPIs.",
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
    summary: "Zentrale Steuerung für Nutzer, Features und Systemeinstellungen.",
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

function PortfolioCardShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`portfolio-card spotlight-surface premium-hover-card group rounded-2xl border border-border/80 ${className}`}
      onMouseMove={handleSpotlightMove}
      onMouseLeave={handleSpotlightLeave}
    >
      <span className="spotlight-surface-border" aria-hidden />
      <span className="spotlight-surface-glow" aria-hidden />
      <span className="premium-hover-glow" aria-hidden />
      <div className="portfolio-border-glow" aria-hidden />
      <div className="portfolio-glow" aria-hidden />
      <div className="portfolio-reflection" aria-hidden />
      {children}
    </article>
  );
}

function ProjectScreenshot({
  project,
  variant,
  priority = false,
}: {
  project: Project;
  variant: "featured" | "compact";
  priority?: boolean;
}) {
  const chromeClass =
    variant === "featured"
      ? "portfolio-browser-chrome"
      : "portfolio-browser-chrome portfolio-browser-chrome--compact";

  return (
    <div
      className={`portfolio-image-wrap relative ${
        variant === "featured"
          ? "portfolio-image-wrap--featured"
          : "portfolio-image-wrap--compact"
      }`}
    >
      <div className="portfolio-image-frame" aria-hidden />
      <div
        className={`browser-chrome ${chromeClass} absolute inset-x-0 top-0 z-10 flex items-center gap-1.5`}
      >
        <div className="flex gap-1">
          <span className="portfolio-browser-dot bg-[#ff5f57]" />
          <span className="portfolio-browser-dot bg-[#febc2e]" />
          <span className="portfolio-browser-dot bg-[#28c840]" />
        </div>
        <div className="portfolio-browser-bar" />
      </div>

      <div
        className={`portfolio-screenshot absolute inset-0 bg-[#080808] ${
          variant === "featured"
            ? "portfolio-screenshot--featured"
            : "portfolio-screenshot--compact"
        }`}
      >
        <Image
          src={project.image}
          alt={`${project.name} — ${project.subtitle}`}
          fill
          className="portfolio-screenshot-img object-cover object-top"
          sizes={
            variant === "featured"
              ? "100vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          }
          priority={priority}
        />
        <div
          className={`portfolio-screenshot-vignette pointer-events-none absolute inset-0 ${
            variant === "featured"
              ? "portfolio-screenshot-vignette--featured"
              : "portfolio-screenshot-vignette--compact"
          }`}
        />
      </div>
    </div>
  );
}

function FeaturedProjectCard({ project }: { project: Project }) {
  return (
    <PortfolioCardShell className="portfolio-card--featured">
      <div className="portfolio-card-inner">
        <ProjectScreenshot project={project} variant="featured" priority />
        <div className="portfolio-card-body portfolio-card-body--featured">
          <div className="portfolio-card-header min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h3 className="portfolio-card-title portfolio-card-title--featured transition-colors duration-400 group-hover:text-foreground">
                {project.name}
              </h3>
              <span className="portfolio-location-badge">
                {project.location}
              </span>
            </div>
            <p className="portfolio-card-subtitle portfolio-card-subtitle--featured">
              {project.subtitle}
            </p>
          </div>

          <p className="portfolio-card-description portfolio-card-description--featured">
            {project.description}
          </p>

          <ProjectTags tags={project.tags} variant="featured" />

          <span className="portfolio-case-study portfolio-case-study--featured">
            View Case Study
            <ArrowUpRight className="portfolio-case-study-icon h-4 w-4" />
          </span>
        </div>
      </div>
    </PortfolioCardShell>
  );
}

function CompactProjectCard({ project }: { project: Project }) {
  return (
    <PortfolioCardShell className="portfolio-card--compact h-full">
      <div className="portfolio-card-inner portfolio-card-inner--compact">
        <ProjectScreenshot project={project} variant="compact" />
        <div className="portfolio-card-body portfolio-card-body--compact">
          <div className="portfolio-compact-header">
            <span className="portfolio-compact-eyebrow">{project.location}</span>
            <h3 className="portfolio-compact-title transition-colors duration-400 group-hover:text-foreground">
              {project.subtitle}
            </h3>
          </div>

          <p className="portfolio-compact-description">{project.summary}</p>

          <ProjectTags tags={project.tags} variant="compact" limit={3} />

          <span className="portfolio-case-study portfolio-case-study--compact">
            Case Study
            <ArrowUpRight className="portfolio-case-study-icon h-3 w-3" />
          </span>
        </div>
      </div>
    </PortfolioCardShell>
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
    <div className="portfolio-block space-y-10 sm:space-y-11">
      <SectionHeader
        align="left"
        label={label}
        title={title}
        description={description}
        className="max-w-3xl"
      />

      <div className="portfolio-block-layout space-y-5 sm:space-y-6">
        <AnimatedSection>
          <FeaturedProjectCard project={featured} />
        </AnimatedSection>

        <StaggerGrid className="portfolio-showcase-grid grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 lg:gap-4">
          {projects.map((project) => (
            <StaggerItem key={project.id} className="h-full">
              <CompactProjectCard project={project} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      </div>
    </div>
  );
}

export function Portfolio() {
  return (
    <section id="portfolio" className="section-shell">
      <GradientGlow
        variant="cyan"
        className="right-0 top-1/4 h-80 w-80 opacity-35"
      />
      <GradientGlow
        variant="violet"
        className="-left-24 bottom-0 h-72 w-72 opacity-40"
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

        <div className="section-content space-y-28 sm:space-y-32">
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

        <AnimatedSection delay={0.15} className="mt-16 sm:mt-20">
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
                  Erlebnisse, die vertrauenswürdig wirken und messbar Ergebnisse
                  liefern.
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
