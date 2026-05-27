/** Central Cal.com booking URL — single source of truth for all CTAs */
export const bookingLink =
  "https://cal.eu/nex-agency/30min?overlayCalendar=true";

/** @alias bookingLink */
export const BOOKING_URL = bookingLink;

/** Section anchor for the booking embed (not #contact) */
export const BOOKING_SECTION_ID = "booking";

export const CONTACT_EMAIL = "hello@nexagency.com";

/** Cal.com iframe embed (dark theme) */
export const BOOKING_EMBED_URL =
  "https://cal.eu/nex-agency/30min/embed?theme=dark&layout=month_view&overlayCalendar=true";

/** @deprecated Use bookingLink */
export const CALENDLY_URL = bookingLink;

export const contactChannels = [
  {
    id: "cal-primary",
    label: "Cal.com",
    headline: "Termin buchen",
    description:
      "30 Minuten Strategiegespräch — kostenlos, unverbindlich, mit klarer Empfehlung im Anschluss.",
    href: bookingLink,
    cta: "Erstgespräch buchen",
    external: true,
    placeholder: false,
  },
] as const;
