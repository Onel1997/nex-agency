import { ArrowRight } from "lucide-react";

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  icon?: boolean;
  className?: string;
}

export function Button({
  href,
  children,
  variant = "primary",
  icon = false,
  className = "",
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full text-[14px] font-medium tracking-[-0.01em] transition-all duration-300 ease-out";

  const variants = {
    primary: "btn-primary px-6 py-3.5 text-white sm:px-7 sm:py-3.5",
    secondary:
      "btn-secondary px-6 py-3.5 text-foreground/90 sm:px-7 sm:py-3.5",
    ghost: "px-4 py-2 text-muted hover:text-foreground",
  };

  return (
    <a href={href} className={`group ${base} ${variants[variant]} ${className}`}>
      {children}
      {icon && (
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      )}
    </a>
  );
}
