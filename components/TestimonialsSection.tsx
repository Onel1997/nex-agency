"use client";

import { Check, Quote, Star } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { GradientGlow } from "./motion/GradientGlow";
import { RevealCard } from "./motion/RevealCard";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";
import { SectionHeader } from "./ui/SectionHeader";

const trustBadges = [
  "DSGVO-konform",
  "Made in Germany",
  "Schnelle Umsetzung",
  "Persönlicher Support",
];

const testimonials = [
  {
    name: "Sabine Hartmann",
    role: "Inhaberin",
    business: "Friseur Partnach · München",
    industry: "Friseursalon",
    initials: "SH",
    accent: "from-violet-500/25 to-fuchsia-500/10",
    quote:
      "Endlich eine Website, die so hochwertig wirkt wie unser Salon. Die Online-Terminbuchung läuft reibungslos — und wir bekommen spürbar mehr Neukunden aus der Umgebung.",
    rating: 5,
  },
  {
    name: "Thomas Berger",
    role: "Geschäftsführer",
    business: "Berger Elektrotechnik · Augsburg",
    industry: "Handwerk",
    initials: "TB",
    accent: "from-cyan-500/20 to-violet-500/10",
    quote:
      "Klarer Prozess, schnelle Umsetzung und ein Auftritt, der Vertrauen schafft. Anfragen kommen jetzt strukturiert rein — ohne dass wir uns um Technik kümmern müssen.",
    rating: 5,
  },
  {
    name: "Dr. Laura Weiß",
    role: "Gründerin",
    business: "Weiß Consulting · Hamburg",
    industry: "Coaching & Beratung",
    initials: "LW",
    accent: "from-emerald-500/15 to-cyan-500/10",
    quote:
      "NexAgency hat unsere Marke digital auf Augenhöhe mit Premium-Beratung gebracht. Die KI-Content-Planung spart uns jede Woche Stunden — professionell und ohne Qualitätsverlust.",
    rating: 5,
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${count} von 5 Sternen`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5 fill-amber-400/90 text-amber-400/90"
          strokeWidth={0}
        />
      ))}
    </div>
  );
}

function TestimonialCard({
  testimonial,
}: {
  testimonial: (typeof testimonials)[number];
}) {
  return (
    <RevealCard as="article" className="h-full">
      <div className="testimonial-card glass-card flex h-full flex-col rounded-2xl p-7 sm:p-8">
        <Quote className="h-5 w-5 text-violet-400/40" strokeWidth={1.5} />

        <p className="testimonial-quote mt-5 flex-1 text-[15px] leading-[1.8] text-muted">
          „{testimonial.quote}"
        </p>

        <div className="mt-8 flex items-center gap-4 border-t border-border/70 pt-6">
          <div
            className={`testimonial-avatar flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${testimonial.accent} text-sm font-semibold text-foreground ring-2 ring-background`}
          >
            {testimonial.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold tracking-[-0.02em] text-foreground/95">
              {testimonial.name}
            </p>
            <p className="text-[12px] text-muted-soft">
              {testimonial.role} · {testimonial.business}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="testimonial-industry">{testimonial.industry}</span>
              <StarRating count={testimonial.rating} />
            </div>
          </div>
        </div>
      </div>
    </RevealCard>
  );
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="section-shell">
      <GradientGlow
        variant="mixed"
        className="left-1/2 top-1/2 h-96 w-[min(100%,52rem)] -translate-x-1/2 -translate-y-1/2 opacity-50"
      />
      <GradientGlow
        variant="violet"
        className="-left-20 bottom-0 h-64 w-64 opacity-60"
      />

      <div className="section-inner">
        <SectionHeader
          label="Kundenstimmen"
          title={
            <>
              Vertrauen, das{" "}
              <span className="gradient-text">vor Ort ankommt</span>
            </>
          }
          description="Lokale Unternehmen und Beratungen, die mit NexAgency online premium wirken — und messbar mehr Anfragen erhalten."
        />

        <AnimatedSection delay={0.08} className="mt-12">
          <div className="testimonial-trust-row">
            {trustBadges.map((badge) => (
              <span key={badge} className="testimonial-trust-badge">
                <Check className="h-3.5 w-3.5 text-cyan-400/90" strokeWidth={2.5} />
                {badge}
              </span>
            ))}
          </div>
        </AnimatedSection>

        <StaggerGrid className="mt-14 grid gap-5 md:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-6">
          {testimonials.map((testimonial) => (
            <StaggerItem key={testimonial.name} className="h-full">
              <TestimonialCard testimonial={testimonial} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      </div>
    </section>
  );
}
