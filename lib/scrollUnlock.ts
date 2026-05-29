const SCROLL_LOCK_CLASSES = [
  "overflow-hidden",
  "modal-open",
  "menu-open",
  "nav-open",
] as const;

export function isTouchLikeDevice() {
  if (typeof window === "undefined") return true;

  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 1023px)").matches
  );
}

/** Apply iOS-friendly scroll container styles on touch devices. */
export function ensureTouchScrollStyles() {
  if (typeof document === "undefined" || !isTouchLikeDevice()) return;

  const html = document.documentElement;
  const body = document.body;

  html.classList.add("is-touch");
  html.style.overflowX = "hidden";
  html.style.overflowY = "auto";
  html.style.scrollBehavior = "auto";
  (html.style as CSSStyleDeclaration & { webkitOverflowScrolling?: string })
    .webkitOverflowScrolling = "touch";

  body.style.overflowX = "hidden";
  body.style.overflowY = "auto";
  body.style.touchAction = "pan-y";
  (body.style as CSSStyleDeclaration & { webkitOverflowScrolling?: string })
    .webkitOverflowScrolling = "touch";
}

/** Clear inline scroll locks — never set overflow:hidden on document elsewhere. */
export function unlockDocumentScroll() {
  if (typeof document === "undefined") return;

  for (const el of [document.documentElement, document.body]) {
    el.style.removeProperty("overflow");
    el.style.removeProperty("overflow-y");
    el.style.removeProperty("overflow-x");
    el.style.removeProperty("position");
    el.style.removeProperty("height");
    el.style.removeProperty("width");
    el.style.removeProperty("top");
    el.style.removeProperty("left");
    el.style.removeProperty("right");
    el.style.removeProperty("padding-right");
    el.style.removeProperty("touch-action");
    el.classList.remove(...SCROLL_LOCK_CLASSES);
  }

  document.documentElement.classList.add("scroll-ready");
  ensureTouchScrollStyles();
}
