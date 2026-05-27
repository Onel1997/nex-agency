"use client";

import { Quote } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { GradientGlow } from "./motion/GradientGlow";
import { RevealCard } from "./motion/RevealCard";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";
import { SectionHeader } from "./ui/SectionHeader";
import { AnimatedCounter, type CounterFormat } from "./stats/AnimatedCounter";

type ProofMetric = {
  format: CounterFormat;
  label: string;
};

const metrics: ProofMetric[] = [
  { format: { kind: "plus", end: 15 }, label: "Projekte umgesetzt" },
  { format: { kind: "plus", end: 50, unit: "k" }, label: "Nutzer erreicht" },
  {
    format: { kind: "decimal", end: 2.8, suffix: "x" },
    label: "Conversion Lift im Ø",
  },
  {
    format: { kind: "prefix", prefix: "<", end: 48, suffix: "h" },
    label: "Antwortzeit",
  },
  { format: { kind: "percent", end: 100 }, label: "Individuelles Design" },
];

const brandPills = [
  { monogram: "FP", name: "Friseur Partnach", category: "Local Business" },
  { monogram: "NT", name: "NexTrends", category: "AI SaaS" },
  { monogram: "HW", name: "Handwerk & Service", category: "Mittelstand" },
  { monogram: "CR", name: "Creator Teams", category: "Marketing" },
  { monogram: "BC", name: "Beratung & Coaching", category: "B2B" },
];

const testimonials = [
  {
    quote:
      "Die erste Website, die wirklich nach unserer Marke aussieht — endlich wirkt online alles so hochwertig wie im Salon.",
    name: "Sabine H.",
    role: "Inhaberin",
    company: "Friseur Partnach · München",
    accent: "from-violet-500/20 to-fuchsia-500/8",
  },
  {
    quote:
      "Deutlich professionellerer Auftritt und spürbar mehr Anfragen. Der Prozess war klar, schnell und ohne Technik-Stress.",
    name: "Thomas B.",
    role: "Geschäftsführer",
    company: "Handwerk · Bayern",
    accent: "from-cyan-500/18 to-violet-500/8",
  },
  {
    quote:
      "Von der ersten Skizze bis zum Launch: premium, durchdacht und messbar. Unsere SaaS wirkt endlich wie ein echtes Produkt.",
    name: "Laura W.",
    role: "Gründerin",
    company: "SaaS & Beratung",
    accent: "from-violet-500/15 to-cyan-500/10",
  },
];

function ProofMetricCard({ metric }: { metric: ProofMetric }) {
  return (
    <RevealCard as="article" className="proof-metric-card group h-full">
      <div className="proof-metric-glow" aria-hidden />
      <div className="proof-metric-inner glass-card h-full rounded-2xl">
        <AnimatedCounter format={metric.format} className="proof-metric-value" />
        <p className="proof-metric-label">{metric.label}</p>
      </div>
    </RevealCard>
  );
}

function BrandPill({
  monogram,
  name,
  category,
}: (typeof brandPills)[number]) {
  return (
    <div className="proof-brand-pill group">
      <span className="proof-brand-monogram" aria-hidden>
        {monogram}
      </span>
      <span className="proof-brand-copy">
        <span className="proof-brand-name">{name}</span>
        <span className="proof-brand-category">{category}</span>
      </span>
    </div>
  );
}

function ProofTestimonialCard({
  testimonial,
}: {
  testimonial: (typeof testimonials)[number];
}) {
  return (
    <RevealCard as="article" className="h-full">
      <blockquote className="proof-testimonial glass-card m-0 h-full rounded-2xl">
        <Quote
          className="proof-testimonial-icon h-4 w-4 text-violet-400/35"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="proof-testimonial-quote">„{testimonial.quote}"</p>
        <footer className="proof-testimonial-footer">
          <div
            className={`proof-testimonial-accent bg-gradient-to-br ${testimonial.accent}`}
            aria-hidden
          />
          <div className="min-w-0">
            <cite className="proof-testimonial-name not-italic">
              {testimonial.name}
            </cite>
            <p className="proof-testimonial-role">
              {testimonial.role} · {testimonial.company}
            </p>
          </div>
        </footer>
      </blockquote>
    </RevealCard>
  );
}

export function TrustProofSection() {
  return (
    <section id="ergebnisse" className="proof-section section-shell" aria-label="Ergebnisse und Vertrauen">
      <div className="proof-section-backdrop" aria-hidden />
      <GradientGlow
        variant="mixed"
        className="left-1/2 top-[18%] h-80 w-[min(100%,36rem)] -translate-x-1/2 opacity-30"
      />

      <div className="section-inner">
        <SectionHeader
          label="Ergebnisse & Vertrauen"
          title={
            <>
              Zahlen, die{" "}
              <span className="gradient-text">Vertrauen schaffen</span>
            </>
          }
          description="Messbare Ergebnisse, echte Partnerschaften und ein Auftritt, der bei lokalen Marken und modernen Teams überzeugt."
        />

        <StaggerGrid className="proof-metrics-grid section-content">
          {metrics.map((metric) => (
            <StaggerItem key={metric.label} className="h-full">
              <ProofMetricCard metric={metric} />
            </StaggerItem>
          ))}
        </StaggerGrid>

        <AnimatedSection delay={0.06} className="proof-trust-panel mt-16 sm:mt-20">
          <div className="proof-trust-panel-inner">
            <p className="proof-trust-headline">
              Vertraut von lokalen Marken & modernen Teams
            </p>
            <p className="proof-trust-subline">
              Von Premium-Salons und Handwerk bis zu SaaS-Produkten — diskret,
              partnerschaftlich und auf Wirkung ausgelegt.
            </p>
            <div className="proof-brands-row">
              {brandPills.map((brand) => (
                <BrandPill key={brand.monogram} {...brand} />
              ))}
            </div>
          </div>
        </AnimatedSection>

        <div className="mt-20 sm:mt-24">
          <AnimatedSection>
            <p className="proof-testimonials-eyebrow">Stimmen aus der Praxis</p>
          </AnimatedSection>

          <StaggerGrid className="proof-testimonials-grid mt-8 sm:mt-10">
            {testimonials.map((testimonial) => (
              <StaggerItem key={testimonial.name} className="h-full">
                <ProofTestimonialCard testimonial={testimonial} />
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </div>
    </section>
  );
}
