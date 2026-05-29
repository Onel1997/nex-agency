"use client";

import {
  ensureTouchScrollStyles,
  isTouchLikeDevice,
  unlockDocumentScroll,
} from "@/lib/scrollUnlock";
import { useLayoutEffect } from "react";

/**
 * Native scroll on load/refresh, smooth in-page anchors on desktop only,
 * and clearing accidental document scroll locks before paint + on hydrate.
 */
export function ScrollBehavior() {
  useLayoutEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "auto";
    }

    unlockDocumentScroll();
    ensureTouchScrollStyles();

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) unlockDocumentScroll();
    };

    const onAnchorClick = (event: MouseEvent) => {
      if (isTouchLikeDevice()) return;

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

    window.addEventListener("pageshow", onPageShow);

    if (!isTouchLikeDevice()) {
      document.addEventListener("click", onAnchorClick);
    }

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("click", onAnchorClick);
    };
  }, []);

  return null;
}
