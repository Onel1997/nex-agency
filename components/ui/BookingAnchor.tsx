"use client";

import { handleBookingClick } from "@/lib/openBooking";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type BookingAnchorProps = Omit<ComponentPropsWithoutRef<"button">, "type"> & {
  children: ReactNode;
  onAfterOpen?: () => void;
};

/** CTA control — button element, opens Cal.com via window.open (never mailto) */
export function BookingAnchor({
  children,
  className = "",
  onAfterOpen,
  onClick,
  ...rest
}: BookingAnchorProps) {
  return (
    <button
      type="button"
      data-booking-cta
      className={className}
      onClick={(e) => {
        handleBookingClick(e, onAfterOpen);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
