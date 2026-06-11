"use client";

import { motion } from "framer-motion";
import { easePremium } from "@/lib/motion";
import { bookingLink } from "@/lib/contact";
import { unlockDocumentScroll } from "@/lib/scrollUnlock";
import { useMotionProfile } from "@/lib/useMotionProfile";
import { Sparkles, Menu, X, LayoutDashboard, LogIn } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const links = [
  { label: "Leistungen", href: "#services" },
  { label: "Ansatz", href: "#why" },
  { label: "Projekte", href: "#portfolio" },
  { label: "Prozess", href: "#process" },
];

function NavAuthIconCTA({
  isAuthenticated,
  onNavigate,
}: {
  isAuthenticated: boolean;
  onNavigate?: () => void;
}) {
  const href = isAuthenticated ? "/dashboard" : "/login";
  const label = isAuthenticated ? "Dashboard" : "Login";
  const Icon = isAuthenticated ? LayoutDashboard : LogIn;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="nav-auth-icon-btn md:hidden"
      aria-label={label}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </Link>
  );
}

function NavAuthCTA({
  isAuthenticated,
  className = "",
  onNavigate,
  menu = false,
}: {
  isAuthenticated: boolean;
  className?: string;
  onNavigate?: () => void;
  menu?: boolean;
}) {
  const href = isAuthenticated ? "/dashboard" : "/login";
  const label = isAuthenticated ? "Dashboard" : "Login";

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`nav-booking-cta ${menu ? "nav-booking-cta--menu" : ""} ${className}`.trim()}
    >
      {label}
    </Link>
  );
}

function NavBookingCTA({
  className = "",
  onNavigate,
  menu = false,
}: {
  className?: string;
  onNavigate?: () => void;
  menu?: boolean;
}) {
  return (
    <a
      href={bookingLink}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavigate}
      className={`nav-booking-cta ${menu ? "nav-booking-cta--menu" : ""} ${className}`.trim()}
    >
      Termin buchen
    </a>
  );
}

function NavbarContent({
  navShellClass,
  open,
  toggleMenu,
  closeMenu,
  isAuthenticated,
}: {
  navShellClass: string;
  open: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
  isAuthenticated: boolean;
}) {
  return (
    <>
      <nav className={navShellClass}>
        <a
          href="/"
          className="nav-logo-link flex min-w-0 flex-1 items-center gap-2 md:gap-2.5"
          aria-label="NexAgency Startseite"
        >
          <span className="nav-logo-mark flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 shadow-[0_4px_20px_-4px_rgba(124,58,237,0.5)] md:h-8 md:w-8">
            <Sparkles className="nav-logo-icon h-3.5 w-3.5 text-white md:h-4 md:w-4" />
          </span>
          <span className="nav-logo-text truncate text-[15px] font-semibold tracking-[-0.025em] md:text-[17px]">
            Nex<span className="gradient-text">Agency</span>
          </span>
        </a>

        <div className="hidden items-center gap-9 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="nav-link">
              {link.label}
            </a>
          ))}
        </div>

        <div className="nav-toolbar flex shrink-0 items-center gap-1.5 md:gap-2">
          <NavBookingCTA className="nav-booking-cta--toolbar inline-flex shrink-0 md:inline-flex" />
          <NavAuthCTA
            isAuthenticated={isAuthenticated}
            className="hidden shrink-0 md:inline-flex"
          />
          <NavAuthIconCTA isAuthenticated={isAuthenticated} />
          <button
            type="button"
            onClick={toggleMenu}
            className="nav-menu-toggle rounded-lg p-1.5 text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground md:hidden md:p-2"
            aria-expanded={open}
            aria-label={open ? "Menü schließen" : "Menü öffnen"}
          >
            {open ? <X className="h-[18px] w-[18px] md:h-5 md:w-5" /> : <Menu className="h-[18px] w-[18px] md:h-5 md:w-5" />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="site-nav-mobile-panel mx-auto mt-2 max-w-6xl rounded-2xl border border-border bg-surface/95 p-4 nav-blur-strong md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function Navbar({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { full } = useMotionProfile();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const closeMenu = useCallback(() => {
    setOpen(false);
    unlockDocumentScroll();
  }, []);

  const toggleMenu = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (!next) unlockDocumentScroll();
      return next;
    });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    unlockDocumentScroll();
  }, []);

  useEffect(() => {
    if (!open) unlockDocumentScroll();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeMenu]);

  const navShellClass = `site-nav-shell mx-auto flex min-w-0 max-w-6xl items-center justify-between gap-2 rounded-2xl border px-3 py-2 transition-[border-color,background-color,box-shadow] duration-300 md:gap-0 md:px-5 md:py-3 ${
    scrolled
      ? "border-border-strong bg-surface/92 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] nav-blur-strong"
      : "border-border/50 bg-surface/55 nav-blur"
  }`;

  /** Matches pt-4 + nav row (py-3, h-8) — reserves layout space for fixed header */
  const headerClass =
    "site-nav-header fixed inset-x-0 top-0 z-[100] overflow-x-hidden px-3 pt-2 md:px-6 md:pt-4";

  const content = (
    <NavbarContent
      navShellClass={navShellClass}
      open={open}
      toggleMenu={toggleMenu}
      closeMenu={closeMenu}
      isAuthenticated={isAuthenticated}
    />
  );

  return (
    <>
      {full ? (
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: easePremium }}
          className={headerClass}
        >
          {content}
        </motion.header>
      ) : (
        <header className={headerClass}>{content}</header>
      )}
      <div className="site-nav-spacer" aria-hidden />
    </>
  );
}
