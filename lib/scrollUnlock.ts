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
    el.classList.remove("overflow-hidden", "modal-open", "menu-open", "nav-open");
  }
}

export function isTouchLikeDevice() {
  if (typeof window === "undefined") return true;

  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 1023px)").matches
  );
}
