"use client";

import { motion } from "framer-motion";

export function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 48, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="relative mx-auto w-full max-w-xl lg:max-w-none"
    >
      <div className="absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-violet-500/18 via-transparent to-cyan-400/8 blur-3xl" />

      <div className="glass-card relative overflow-hidden rounded-2xl">
        <div className="browser-chrome flex items-center gap-3 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="browser-dot bg-[#ff5f57]" />
            <span className="browser-dot bg-[#febc2e]" />
            <span className="browser-dot bg-[#28c840]" />
          </div>
          <div className="mx-auto flex h-7 w-full max-w-xs items-center rounded-md bg-white/[0.04] px-3">
            <span className="truncate text-[11px] text-muted-soft">
              bloomdental.de
            </span>
          </div>
        </div>

        <div className="relative bg-[#f8fafc] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-800">
                Bloom Dental
              </span>
            </div>
            <div className="hidden gap-3 sm:flex">
              {["Leistungen", "Team", "Bewertungen"].map((item) => (
                <span
                  key={item}
                  className="text-[10px] font-medium text-slate-500"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-[1.1fr_0.9fr] sm:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                Familienzahnarzt · München
              </p>
              <h3 className="mt-2 text-lg font-semibold leading-tight text-slate-900 sm:text-xl">
                Betreuung, die ruhig, modern und persönlich wirkt.
              </h3>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Termine noch diese Woche, transparente Preise und ein Team, das
                Patienten gerne aufsucht.
              </p>
              <div className="mt-4 flex gap-2">
                <span className="rounded-md bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white">
                  Termin buchen
                </span>
                <span className="rounded-md border border-slate-200 px-3 py-1.5 text-[10px] font-medium text-slate-600">
                  Leistungen ansehen
                </span>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.25),transparent_55%)]" />
              <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/90 p-2.5 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-medium text-slate-500">
                      Nächster Termin
                    </p>
                    <p className="text-[11px] font-semibold text-slate-800">
                      Do · 14:30 Uhr
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-medium text-emerald-700">
                    Verfügbar
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="absolute -right-2 top-16 hidden w-44 rounded-xl border border-border bg-surface-elevated/95 p-3 shadow-2xl backdrop-blur-xl sm:block lg:-right-8"
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-violet-300/70">
          KI-Content-Warteschlange
        </p>
        <div className="mt-2.5 space-y-2">
          {[
            { label: "Blog-Entwurf bereit", status: "Prüfung" },
            { label: "Google-Post geplant", status: "Live" },
            { label: "SEO-Seite aktualisiert", status: "Fertig" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-2"
            >
              <span className="text-[10px] text-muted">{item.label}</span>
              <span className="text-[9px] font-medium text-cyan-300/80">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.85, duration: 0.6 }}
        className="absolute -left-2 bottom-8 hidden w-40 rounded-xl border border-border bg-surface-elevated/95 p-3 shadow-2xl backdrop-blur-xl sm:block lg:-left-10"
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-violet-300/70">
          Diesen Monat
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          Anfragen über die Website
        </p>
        <div className="mt-2 flex items-end gap-1.5">
          {[38, 52, 44, 61, 58, 72].map((h, i) => (
            <div
              key={i}
              className="w-2 rounded-sm bg-gradient-to-t from-violet-600 to-cyan-400"
              style={{ height: `${h * 0.45}px` }}
            />
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-soft">
          Beispiel-Kundendashboard
        </p>
      </motion.div>
    </motion.div>
  );
}
