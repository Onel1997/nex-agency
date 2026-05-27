import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function NextJsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.5 16.5V7.5l4.2 6.4V7.5h1.8v9h-1.9l-4.1-6.3v6.3H7.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function OpenAIIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 3.5c.4-1 .9-1 1.3 0l.6 1.5c.2.5.7.7 1.1.5l1.6-.5c.9-.2 1.5.7 1.2 1.5l-.7 1.5c-.2.5 0 1 .5 1.2l1.5.7c.8.4.8 1.5-.1 1.8l-1.5.6c-.5.2-.7.7-.5 1.1l.5 1.6c.2.9-.7 1.5-1.5 1.2l-1.5-.7c-.5-.2-1 0-1.2.5l-.6 1.5c-.4.9-1.4.9-1.8 0l-.6-1.5c-.2-.5-.7-.7-1.2-.5l-1.6.5c-.9.2-1.5-.7-1.2-1.5l.7-1.5c.2-.5 0-1-.5-1.2l-1.5-.7c-.8-.4-.8-1.5.1-1.8l1.5-.6c.5-.2.7-.7.5-1.1l-.5-1.6c-.2-.9.7-1.5 1.5-1.2l1.5.7c.5.2 1 0 1.2-.5l.6-1.5Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StripeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M4 10.2c0-1.8 1.5-2.7 4.4-2.9 2.1-.1 3.8.4 3.8 2 0 1.3-1.1 1.8-3 2.1-2.7.5-3.6.9-3.6 2.2 0 1.2 1 1.9 2.8 1.9 1.6 0 2.9-.5 3.8-1.2l.9 2.8c-1 .7-2.5 1.2-4.6 1.2-3.2 0-5.3-1.5-5.3-4 0-1.9 1.5-2.9 4.2-3.2Z"
        fill="currentColor"
      />
      <path
        d="M19 6.5v11h-2.8l-.4-2.1h-.1c-.9 1.4-2.2 2.2-4 2.2-2.5 0-4-1.8-4-4.6 0-3.1 2.2-5.5 6.5-5.5H19Zm-3.2 7.8.3-1.6h-.8c-1.5 0-2.4.8-2.4 2.1 0 1.1.7 1.7 1.7 1.7 1.1 0 1.9-.7 2.2-2.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SupabaseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M14.2 3.2 8.4 18.8c-.4.9-1.6.3-1.4-.7l1.1-7.2H5.2c-.8 0-1.2-1-.6-1.5l7.2-6.5c.7-.6 1.7-.1 1.6.8l-.5 2.6h3.9c.8 0 1.2 1 .6 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function VercelIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M12 3 4 20h16L12 3Z" fill="currentColor" />
    </svg>
  );
}
