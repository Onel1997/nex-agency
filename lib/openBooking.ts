import { bookingLink } from "@/lib/contact";
import type { MouseEvent } from "react";

const BOOKING_WINDOW_FEATURES = "noopener,noreferrer";

/** Hard-coded Cal.com URL — never mailto */
const CAL_BOOKING_URL =
  "https://cal.eu/nex-agency/30min?overlayCalendar=true" as const;

/** Open Cal.com booking in a new tab — use for ALL CTA clicks */
export function openBooking() {
  window.open(CAL_BOOKING_URL, "_blank", BOOKING_WINDOW_FEATURES);
}

export function isBookingHref(href: string) {
  if (href.startsWith("mailto:")) return false;
  return href === bookingLink || href === CAL_BOOKING_URL || href.includes("cal.eu/nex-agency/30min");
}

/** Props for optional fallback <a> — href is always Cal.com, never mailto */
export const bookingAnchorProps = {
  href: CAL_BOOKING_URL,
  target: "_blank" as const,
  rel: "noopener noreferrer" as const,
};

export function handleBookingClick(
  event: MouseEvent<HTMLElement>,
  callback?: () => void
) {
  event.preventDefault();
  event.stopPropagation();
  openBooking();
  callback?.();
}
