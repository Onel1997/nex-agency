"use client";

import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { handleBookingClick } from "@/lib/openBooking";

export type ContactCardProps = {
  icon: LucideIcon;
  label: string;
  headline: string;
  description: string;
  cta: string;
  placeholder?: boolean;
  accent?: "violet" | "cyan" | "mixed";
};

const accentMap = {
  violet: "contact-card--violet",
  cyan: "contact-card--cyan",
  mixed: "contact-card--mixed",
};

export function ContactCard({
  icon: Icon,
  label,
  headline,
  description,
  cta,
  placeholder = false,
  accent = "violet",
}: ContactCardProps) {
  return (
    <button
      type="button"
      data-booking-cta
      onClick={handleBookingClick}
      className={`contact-card glass-card glass-card--hover group w-full text-left ${accentMap[accent]}`}
    >
      <span className="contact-card-shine" aria-hidden />
      <div className="contact-card-top">
        <span className="contact-card-icon" aria-hidden>
          <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
        </span>
        <span className="contact-card-meta">
          <span className="contact-card-label">{label}</span>
          {placeholder && (
            <span className="contact-card-badge">Platzhalter</span>
          )}
        </span>
        <ArrowUpRight
          className="contact-card-arrow ml-auto h-4 w-4 shrink-0"
          strokeWidth={2}
          aria-hidden
        />
      </div>
      <h3 className="contact-card-headline">{headline}</h3>
      <p className="contact-card-desc">{description}</p>
      <span className="contact-card-cta">
        <span>{cta}</span>
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </span>
    </button>
  );
}
