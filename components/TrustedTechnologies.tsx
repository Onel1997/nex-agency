"use client";

import { AnimatedSection } from "./AnimatedSection";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";
import {
  NextJsIcon,
  OpenAIIcon,
  StripeIcon,
  SupabaseIcon,
  VercelIcon,
} from "./tech/TechLogos";
import type { ComponentType, SVGProps } from "react";

type Technology = {
  id: string;
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: string;
};

const technologies: Technology[] = [
  {
    id: "nextjs",
    name: "Next.js",
    Icon: NextJsIcon,
    accent: "tech-pill--next",
  },
  {
    id: "openai",
    name: "OpenAI",
    Icon: OpenAIIcon,
    accent: "tech-pill--openai",
  },
  {
    id: "stripe",
    name: "Stripe",
    Icon: StripeIcon,
    accent: "tech-pill--stripe",
  },
  {
    id: "supabase",
    name: "Supabase",
    Icon: SupabaseIcon,
    accent: "tech-pill--supabase",
  },
  {
    id: "vercel",
    name: "Vercel",
    Icon: VercelIcon,
    accent: "tech-pill--vercel",
  },
];

function TechPill({ tech }: { tech: Technology }) {
  const { Icon } = tech;

  return (
    <div className={`tech-pill group ${tech.accent}`} role="listitem">
      <span className="tech-pill-glow" aria-hidden />
      <span className="tech-pill-inner">
        <Icon className="tech-pill-icon h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5" />
        <span className="tech-pill-name">{tech.name}</span>
      </span>
    </div>
  );
}

export function TrustedTechnologies() {
  return (
    <section
      className="tech-trust-section section-bridge"
      aria-label="Trusted Technologies"
    >
      <div className="tech-trust-backdrop" aria-hidden />
      <div className="section-inner">
        <AnimatedSection>
          <p className="section-label text-center">Trusted Technologies</p>
          <p className="tech-trust-subline">
            Bewährte Tools für schnelle, sichere und skalierbare Produkte.
          </p>
        </AnimatedSection>

        <div role="list" aria-label="Technologie-Partner">
          <StaggerGrid className="tech-trust-grid mt-8 sm:mt-10">
            {technologies.map((tech) => (
              <StaggerItem key={tech.id}>
                <TechPill tech={tech} />
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </div>
    </section>
  );
}
