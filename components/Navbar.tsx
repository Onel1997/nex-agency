"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { easePremium } from "@/lib/motion";
import { Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/Button";

const links = [
  { label: "Leistungen", href: "#services" },
  { label: "Ansatz", href: "#why" },
  { label: "Projekte", href: "#portfolio" },
  { label: "Prozess", href: "#process" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 24);
  });

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: easePremium }}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6"
    >
      <nav
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-2xl border px-5 py-3 transition-[border-color,background-color,box-shadow] duration-300 ${
          scrolled
            ? "border-border-strong bg-surface/92 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] nav-blur-strong"
            : "border-border/50 bg-surface/55 nav-blur"
        }`}
      >
        <a href="#" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 shadow-[0_4px_20px_-4px_rgba(124,58,237,0.5)]">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.025em]">
            Nex<span className="gradient-text">Agency</span>
          </span>
        </a>

        <div className="hidden items-center gap-9 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="nav-link">
              {link.label}
            </a>
          ))}
          <Button variant="primary" glow className="px-5 py-2 text-[13px]">
            Erstgespräch buchen
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground md:hidden"
          aria-label="Menü öffnen"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easePremium }}
          className="mx-auto mt-2 max-w-6xl rounded-2xl border border-border bg-surface/95 p-4 nav-blur-strong md:hidden"
        >
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <Button
              variant="primary"
              glow
              className="mt-2 w-full py-2.5 text-sm"
            >
              Erstgespräch buchen
            </Button>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
