"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { Calendar, Mail, MessageCircle, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { easePremium } from "@/lib/motion";

const CONTACT_EMAIL = "hello@nexagency.com";
const WHATSAPP_URL = "https://wa.me/491701234567";
const CALENDLY_URL = "https://calendly.com/nexagency/erstgespraech";

const actions = [
  {
    id: "email",
    label: "E-Mail",
    description: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    icon: Mail,
    external: false,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Direkt chatten",
    href: WHATSAPP_URL,
    icon: MessageCircle,
    external: true,
  },
  {
    id: "calendly",
    label: "Termin buchen",
    description: "Calendly · Erstgespräch",
    href: CALENDLY_URL,
    icon: Calendar,
    external: true,
  },
] as const;

const menuVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.04, staggerDirection: -1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: easePremium },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.94,
    transition: { duration: 0.18, ease: easePremium },
  },
};

export function StickyContactCTA() {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className="contact-fab-root">
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            aria-label="Kontaktoptionen"
            className="contact-fab-menu"
            variants={reduced ? undefined : menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {actions.map((action) => (
              <motion.a
                key={action.id}
                role="menuitem"
                href={action.href}
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noopener noreferrer" : undefined}
                className="contact-fab-action group"
                variants={reduced ? undefined : itemVariants}
                onClick={close}
                whileTap={reduced ? undefined : { scale: 0.97 }}
              >
                <span className="contact-fab-action-icon" aria-hidden>
                  <action.icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="contact-fab-action-copy">
                  <span className="contact-fab-action-label">{action.label}</span>
                  <span className="contact-fab-action-desc">{action.description}</span>
                </span>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        className="contact-fab-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        aria-label={open ? "Kontaktmenü schließen" : "Kontakt öffnen"}
        onClick={toggle}
        initial={reduced ? false : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.1, duration: 0.5, ease: easePremium }}
        whileTap={reduced ? undefined : { scale: 0.94 }}
      >
        <span className="contact-fab-trigger-glow" aria-hidden />
        <span className="contact-fab-trigger-inner">
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span
                key="close"
                initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
                transition={{ duration: 0.2, ease: easePremium }}
                className="flex"
              >
                <X className="h-5 w-5" strokeWidth={2.25} />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ opacity: 0, rotate: 45, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: -45, scale: 0.8 }}
                transition={{ duration: 0.2, ease: easePremium }}
                className="flex"
              >
                <MessageCircle className="h-5 w-5" strokeWidth={2} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
    </div>
  );
}
