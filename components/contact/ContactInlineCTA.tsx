"use client";

import { ArrowRight } from "lucide-react";
import { bookingLink } from "@/lib/contact";

type ContactInlineCTAProps = {
  title?: string;
  description?: string;
};

export function ContactInlineCTA({
  title = "Bereit für den nächsten Schritt?",
  description = "Kostenloses Erstgespräch — wir klären Ziele, Umfang und den sinnvollsten Weg für Ihr Projekt.",
}: ContactInlineCTAProps) {
  return (
    <div className="contact-inline-cta glass-card glass-card--hover">
      <div className="contact-inline-cta-copy">
        <p className="contact-inline-cta-eyebrow">Termin</p>
        <p className="contact-inline-cta-title">{title}</p>
        <p className="contact-inline-cta-desc">{description}</p>
      </div>
      <a
        href={bookingLink}
        target="_blank"
        rel="noopener noreferrer"
        className="contact-inline-cta-btn group"
      >
        <span>Erstgespräch buchen</span>
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      </a>
    </div>
  );
}
