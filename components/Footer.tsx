"use client";

import { AtSign, Link2, Share2, Sparkles } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { StaggerGrid, StaggerItem } from "./motion/StaggerGrid";

const socialLinks = [
  { icon: Share2, href: "#", label: "Social Media" },
  { icon: Link2, href: "#", label: "LinkedIn" },
  { icon: AtSign, href: "#", label: "E-Mail" },
];

const footerLinks = [
  {
    title: "Unternehmen",
    links: [
      { label: "Ansatz", href: "#why" },
      { label: "Leistungen", href: "#services" },
      { label: "Prozess", href: "#process" },
      { label: "Kontakt", href: "#contact" },
    ],
  },
  {
    title: "Leistungen",
    links: [
      { label: "Webdesign", href: "#services" },
      { label: "KI-Content-Systeme", href: "#services" },
      { label: "Branding & Wachstum", href: "#services" },
      { label: "Monatlicher Support", href: "#services" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border px-6 pb-10 pt-16 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <StaggerGrid className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <StaggerItem className="lg:col-span-2">
              <a href="#" className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-violet-500/15">
                  <Sparkles className="h-4 w-4 text-white" />
                </span>
                <span className="text-[17px] font-semibold tracking-[-0.02em]">
                  Nex<span className="gradient-text">Agency</span>
                </span>
              </a>
              <p className="mt-4 max-w-sm text-[14px] leading-[1.8] text-muted">
                Premium-Digitalagentur für lokale Unternehmen in Deutschland —
                Webdesign, KI-Systeme und Wachstum aus einer Hand.
              </p>
              <div className="mt-6 flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition-all duration-300 hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300"
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </StaggerItem>

            {footerLinks.map((group) => (
              <StaggerItem key={group.title}>
                <h4 className="text-[13px] font-semibold">{group.title}</h4>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[14px] text-muted transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </StaggerItem>
            ))}
        </StaggerGrid>

        <AnimatedSection delay={0.15} className="mt-14">
          <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
            <p className="text-[13px] text-muted-soft">
              &copy; {new Date().getFullYear()} NexAgency. Alle Rechte vorbehalten.
            </p>
            <div className="flex gap-6 text-[13px] text-muted-soft">
              <a href="#" className="transition-colors hover:text-foreground">
                Datenschutz
              </a>
              <a href="#" className="transition-colors hover:text-foreground">
                AGB
              </a>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </footer>
  );
}
