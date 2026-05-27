"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Calendar } from "lucide-react";
import { handleBookingClick } from "@/lib/openBooking";

export function MobileContactBar() {
  const reduced = useReducedMotion();

  return (
    <div className="mobile-floating-cta-wrap md:hidden">
      <motion.button
        type="button"
        data-booking-cta
        className="mobile-floating-cta group"
        aria-label="Erstgespräch buchen — Cal.com öffnen"
        onClick={handleBookingClick}
        whileHover={reduced ? undefined : { scale: 1.02 }}
        whileTap={reduced ? undefined : { scale: 0.98 }}
      >
        <span className="mobile-floating-cta-glow" aria-hidden />
        <span className="mobile-floating-cta-border" aria-hidden />
        <span className="mobile-floating-cta-inner">
          <Calendar className="mobile-floating-cta-icon h-4 w-4" strokeWidth={2} />
          <span className="mobile-floating-cta-text">Erstgespräch buchen</span>
        </span>
      </motion.button>
    </div>
  );
}
