"use client";

import { unlockDocumentScroll } from "@/lib/scrollUnlock";
import { useEffect } from "react";

/**
 * Native scroll on load/refresh, smooth in-page anchors on desktop click only,
 * and clearing accidental document scroll locks on mount.
 */
export function ScrollBehavior() {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "auto";
    }

    unlockDocumentScroll();

    const onAnchorClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      // Let mobile Safari handle hash navigation natively — no preventDefault.
      if (window.matchMedia("(pointer: coarse)").matches) {
        unlockDocumentScroll();
        return;
      }

      const anchor = (event.target as Element | null)?.closest(
        'a[href^="#"]'
      ) as HTMLAnchorElement | null;

      if (!anchor) return;

      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") return;

      const id = decodeURIComponent(hash.slice(1));
      const target = document.getElementById(id);
      if (!target) return;

      event.preventDefault();

      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      target.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "start",
      });

      window.history.pushState(null, "", hash);
      unlockDocumentScroll();
    };

    document.addEventListener("click", onAnchorClick);

    return () => {
      document.removeEventListener("click", onAnchorClick);
    };
  }, []);

  return null;
}
