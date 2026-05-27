import { bookingLink } from "@/lib/contact";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type BookingAnchorProps = Omit<ComponentPropsWithoutRef<"a">, "href" | "target" | "rel"> & {
  children: ReactNode;
};

export function BookingAnchor({
  children,
  className = "",
  ...rest
}: BookingAnchorProps) {
  return (
    <a
      href={bookingLink}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}
