"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, Calendar, Sparkles } from "lucide-react";
import { BookingAnchor } from "./ui/BookingAnchor";
import { AnimatedSection } from "./AnimatedSection";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";

const footerChannels = [
  { label: "Erstgespräch buchen", icon: Calendar },
  { label: "Termin buchen", icon: Calendar },
] as const;

const navigationLinks = [
  { label: "Leistungen", href: "#services" },
  { label: "Ansatz", href: "#why" },
  { label: "Projekte", href: "#portfolio" },
  { label: "Ergebnisse", href: "#ergebnisse" },
  { label: "Prozess", href: "#process" },
] as const;

const serviceLinks = [
  { label: "Premium-Webdesign", href: "#services" },
  { label: "KI-Content-Systeme", href: "#services" },
  { label: "Branding & Wachstum", href: "#services" },
  { label: "Monatlicher Support", href: "#services" },
  { label: "SaaS & Plattformen", href: "#portfolio" },
];

const legalLinks = [
  { label: "Datenschutz", href: "#" },
  { label: "AGB", href: "#" },
];

function FooterLink({
  href,
  children,
  booking = false,
}: {
  href: string;
  children: ReactNode;
  booking?: boolean;
}) {
  if (booking) {
    return (
      <BookingAnchor className="footer-link group">
        <span className="footer-link-text">{children}</span>
        <span className="footer-link-line" aria-hidden />
      </BookingAnchor>
    );
  }

  return (
    <a href={href} className="footer-link group">
      <span className="footer-link-text">{children}</span>
      <span className="footer-link-line" aria-hidden />
    </a>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="footer-column">
      <h3 className="footer-column-title">{title}</h3>
      {children}
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-divider" aria-hidden>
        <span className="site-footer-divider-glow" />
        <span className="site-footer-divider-line" />
      </div>

      <div className="site-footer-ambient" aria-hidden />
      <div className="site-footer-glass" aria-hidden />

      <div className="section-inner site-footer-inner">
        <StaggerGrid className="site-footer-grid">
          <StaggerItem className="site-footer-brand-col">
            <a href="#" className="footer-logo group">
              <span className="footer-logo-mark">
                <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
              </span>
              <span className="footer-logo-wordmark">
                Nex<span className="gradient-text">Agency</span>
              </span>
            </a>
            <p className="footer-brand-statement">
              Premium-Digitalagentur für lokale Marken und moderne SaaS — mit
              KI, Design und Wachstum auf Enterprise-Niveau.
            </p>
            <BookingAnchor className="footer-email-pill group">
              <span className="footer-email-icon" aria-hidden>
                <Calendar className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="footer-email-copy">
                <span className="footer-email-label">Erstgespräch buchen</span>
                <span className="footer-email-address">30 Min · Cal.com</span>
              </span>
              <ArrowUpRight className="footer-email-arrow h-4 w-4 shrink-0 opacity-60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </BookingAnchor>
            <div className="footer-contact-channels">
              {footerChannels.map((channel) => (
                <BookingAnchor
                  key={channel.label}
                  className="footer-contact-chip group"
                >
                  <channel.icon className="h-3.5 w-3.5 opacity-70 transition-opacity group-hover:opacity-100" strokeWidth={2} />
                  {channel.label}
                </BookingAnchor>
              ))}
            </div>
          </StaggerItem>

          <StaggerItem>
            <FooterColumn title="Navigation">
              <ul className="footer-link-list">
                {navigationLinks.map((link) => (
                  <li key={link.label}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
                <li>
                  <FooterLink href="" booking>
                    Termin buchen
                  </FooterLink>
                </li>
              </ul>
            </FooterColumn>
          </StaggerItem>

          <StaggerItem>
            <FooterColumn title="Leistungen">
              <ul className="footer-link-list">
                {serviceLinks.map((link) => (
                  <li key={link.label}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </FooterColumn>
          </StaggerItem>
        </StaggerGrid>

        <AnimatedSection delay={0.1} className="site-footer-bottom">
          <div className="site-footer-bottom-row">
            <p className="footer-copyright">
              &copy; {year} NexAgency. Alle Rechte vorbehalten.
            </p>
            <ul className="footer-legal-list">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="footer-legal-link">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className="footer-built-with">
            Built with{" "}
            <span className="footer-built-with-accent">Next.js</span> &{" "}
            <span className="footer-built-with-accent">AI</span>
          </p>
        </AnimatedSection>
      </div>
    </footer>
  );
}
