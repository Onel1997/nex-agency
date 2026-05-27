import { Check } from "lucide-react";

const signals = [
  "Persönliche Betreuung",
  "Transparente Festpreise",
  "DSGVO-konform",
  "Aus Deutschland",
];

export function TrustBar() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2.5">
      {signals.map((signal) => (
        <span key={signal} className="trust-pill">
          <Check className="h-3 w-3 text-violet-400/80" strokeWidth={2.5} />
          {signal}
        </span>
      ))}
    </div>
  );
}
