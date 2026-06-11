# Phase 14 — Super Admin Finance Center + Freelancer Billing

Phase 14 erweitert NexAgency um interne Finanzverwaltung, Freelancer-Rechnungen, Auszahlungen und Agenturkosten — **ohne** bestehende Kundenrechnungen, Vertragsrechnungen, Retainer-Systeme oder PDF-Templates für Kunden zu verändern.

## Übersicht

| Bereich | Route | Beschreibung |
|---------|-------|--------------|
| Finance Center | `/dashboard/finance` | KPIs, Gewinnberechnung, bestehende Kunden-/Retainer-Übersicht |
| Freelancer | `/dashboard/finance/freelancers` | Freelancer-Stammdaten und Rechnungen |
| Freelancer-Detail | `/dashboard/finance/freelancers/[id]` | Rechnungen pro Freelancer |
| Auszahlungen | `/dashboard/finance/payouts` | Freelancer-Auszahlungs-Center |
| Ausgaben | `/dashboard/finance/expenses` | Agenturkosten |

Zugriff: `super_admin` und `admin` via `requireFinanceAccess()` / `canAccessFinanceRoutes()`.

---

## Neue Datenbank-Tabellen

Migration: `supabase/migrations/20250619120000_phase14_finance_center.sql`

### `freelancers`

Freelancer-Stammdaten (Vendor-Records, unabhängig vom Team-Rolle `freelancer`).

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `name` | TEXT | Pflichtfeld |
| `company_name` | TEXT | Optional |
| `contact_person` | TEXT | Ansprechpartner |
| `email`, `phone` | TEXT | Kontakt |
| `street`, `postal_code`, `city`, `country` | TEXT | Adresse |
| `tax_number`, `vat_id` | TEXT | Steuerdaten |
| `iban`, `bic` | TEXT | Bankverbindung |
| `default_commission_rate` | NUMERIC | Standard-Provisionssatz (%) |
| `is_active` | BOOLEAN | Aktiv/Inaktiv |
| `last_payout_at` | TIMESTAMPTZ | Letzte Auszahlung |
| `created_at`, `updated_at` | TIMESTAMPTZ | Audit |

Berechnete Felder (nicht in DB, zur Laufzeit):

- **Gesamt verdient** — Summe eingereichter + bezahlter Rechnungen
- **Gesamt ausgezahlt** — Summe ausgezahlter Payouts + bezahlter Rechnungen
- **Noch offen** — Eingereichte Rechnungen minus ausgezahlte Beträge

### `freelancer_invoices`

Rechnungen **vom Freelancer an NexAgency** (nicht Agentur an Kunde).

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `freelancer_id` | UUID FK | Freelancer |
| `invoice_number` | TEXT UNIQUE | Format `FR-YYYY-000001` |
| `description` | TEXT | Leistungsbeschreibung |
| `subtotal_cents`, `tax_amount_cents`, `total_amount_cents` | INTEGER | Beträge |
| `vat_rate` | NUMERIC | Standard 19% |
| `status` | TEXT | `draft`, `submitted`, `paid` |
| `due_date` | DATE | Zahlungsziel |
| `submitted_at`, `paid_at` | TIMESTAMPTZ | Status-Zeitstempel |

Nummernvergabe: RPC `next_freelancer_invoice_number()`.

### `freelancer_payouts`

Auszahlungen an Freelancer.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `freelancer_id` | UUID FK | Empfänger |
| `amount_cents` | INTEGER | Auszahlungsbetrag |
| `payout_date` | DATE | Datum |
| `status` | TEXT | `offen`, `ausgezahlt` |
| `notes` | TEXT | Notiz |

### `freelancer_payout_clients`

Verknüpfung Auszahlung ↔ Kundenprojekte.

| Spalte | Typ |
|--------|-----|
| `payout_id` | UUID FK |
| `client_id` | UUID FK |

### `freelancer_payout_invoices`

Verknüpfung Auszahlung ↔ beglichene Freelancer-Rechnungen (automatisch bei Status `ausgezahlt`).

### `expenses`

Agenturkosten.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `title` | TEXT | Titel |
| `amount_cents` | INTEGER | Betrag |
| `expense_date` | DATE | Datum |
| `category` | TEXT | `software`, `advertising`, `freelancer`, `hosting`, `office`, `other` |
| `note` | TEXT | Notiz |

### RLS

Alle neuen Tabellen: **nur Management** (`is_management()`) — SELECT, INSERT, UPDATE, DELETE.

---

## TypeScript-Typen

Datei: `lib/dashboard/types.ts`

- `FreelancerRecord`
- `FreelancerInvoiceRecord`, `FreelancerInvoiceWithDetails`
- `FreelancerPayoutRecord`
- `ExpenseRecord`
- `ProfitBreakdown`
- Erweitertes `FinanceStats` (Freelancer-KPIs, Ausgaben, Agenturgewinn)

Konstanten: `lib/dashboard/constants.ts`

- `FREELANCER_INVOICE_STATUSES`, `FREELANCER_PAYOUT_STATUSES`
- `EXPENSE_CATEGORIES`, `PROFIT_PERIODS`

---

## Daten-Layer (`lib/dashboard/`)

| Datei | Funktion |
|-------|----------|
| `freelancers.ts` | `getAllFreelancers()`, `getFreelancerById()`, Statistik-Berechnung |
| `freelancer-invoices.ts` | CRUD-Queries, `getFreelancerInvoiceWithDetails()`, KPI-Stats |
| `freelancer-payouts.ts` | `getAllFreelancerPayouts()`, Projekt-Verknüpfungen |
| `expenses.ts` | `getAllExpenses()`, Monats-/Jahreskosten |
| `profit.ts` | Gewinnberechnung nach Zeitraum |
| `finance.ts` | Erweitertes `getFinanceStats()`, `getProfitBreakdowns()` |
| `freelancer-invoice-pdf.ts` | PDF-Generierung (PDFKit, gleiches Design wie Kundenrechnungen) |

---

## Server Actions

### `app/dashboard/finance/freelancers/actions.ts`

| Action | Beschreibung |
|--------|--------------|
| `createFreelancer` | Neuen Freelancer anlegen |
| `updateFreelancer` | Stammdaten bearbeiten |
| `createFreelancerInvoice` | Rechnung als Entwurf erfassen |
| `updateFreelancerInvoiceStatus` | Status: eingereicht / bezahlt |
| `deleteFreelancerInvoice` | Nur Entwürfe löschen |

### `app/dashboard/finance/payouts/actions.ts`

| Action | Beschreibung |
|--------|--------------|
| `createFreelancerPayout` | Auszahlung mit optionalen Projekten |
| `updateFreelancerPayoutStatus` | `offen` → `ausgezahlt` (reduziert offene Forderungen) |
| `deleteFreelancerPayout` | Nur offene Einträge |

### `app/dashboard/finance/expenses/actions.ts`

| Action | Beschreibung |
|--------|--------------|
| `createExpense` | Ausgabe erfassen |
| `updateExpense` | Bearbeiten |
| `deleteExpense` | Löschen |

Bestehende Actions in `app/dashboard/finance/actions.ts` (Retainer, Provisionen) bleiben **unverändert**.

---

## UI-Komponenten

| Komponente | Zweck |
|------------|-------|
| `FinanceSubNav` | Unter-Navigation Finanzen |
| `FreelancersPageClient` | Freelancer-Liste |
| `FreelancerDetailPageClient` | Detail + Rechnungen |
| `FreelancerModal` | Anlegen/Bearbeiten |
| `FreelancerInvoiceModal` | Rechnung erfassen |
| `FreelancerInvoiceStatusBadge` | Status-Badge |
| `PayoutsPageClient` | Auszahlungs-Center |
| `FreelancerPayoutModal` | Auszahlung anlegen |
| `FreelancerPayoutStatusBadge` | Status-Badge |
| `ExpensesPageClient` | Ausgaben-Liste |
| `ExpenseModal` | Ausgabe erfassen/bearbeiten |
| `ProfitBreakdownCard` | Gewinntabelle Monat/Quartal/Jahr/Gesamt |

Erweitert: `FinancePageClient` — neue KPIs + Gewinnberechnung.

Layout: `app/dashboard/finance/layout.tsx` mit `FinanceSubNav`.

---

## Datenfluss

```
Freelancer anlegen
    ↓
Rechnung erfassen (draft) → PDF generieren
    ↓
Als eingereicht markieren (submitted) → offene Freelancer-Forderung
    ↓
Option A: Direkt als bezahlt markieren (paid)
Option B: Auszahlung erfassen → als ausgezahlt markieren
         → eingereichte Rechnungen werden FIFO beglichen (paid)
    ↓
Freelancer-Stats + Finance-KPIs aktualisiert
```

```
Agenturausgabe erfassen (expenses)
    ↓
Monats-/Jahreskosten + Gewinnberechnung aktualisiert
```

Bestehende Kundenrechnungen (`invoices`) fließen nur in die **Gewinnberechnung** (Kundenumsatz) und die **bestehenden KPIs** ein — keine Schema- oder Code-Änderungen.

---

## Statussystem

### Freelancer-Rechnungen

| Status | Label | Bedeutung |
|--------|-------|-----------|
| `draft` | Entwurf | Erfasst, noch nicht eingereicht |
| `submitted` | Eingereicht | Offene Forderung an NexAgency |
| `paid` | Bezahlt | Beglichen (manuell oder via Auszahlung) |

### Freelancer-Auszahlungen

| Status | Label | Bedeutung |
|--------|-------|-----------|
| `offen` | Offen | Geplant, noch nicht überwiesen |
| `ausgezahlt` | Ausgezahlt | Überwiesen; reduziert offene Freelancer-Forderungen |

Bei `ausgezahlt`: eingereichte Rechnungen werden per FIFO bis zur Auszahlungssumme als `paid` markiert und in `freelancer_payout_invoices` verknüpft. `freelancers.last_payout_at` wird gesetzt.

---

## KPI-Berechnung

### Finance Center (`getFinanceStats`)

Bestehende KPIs (unverändert):

- Gesamtumsatz, MRR, Retainer, Kundenrechnungen, Provisionen

Neue KPIs:

| KPI | Quelle |
|-----|--------|
| Offene Freelancer-Rechnungen | Summe `submitted` Rechnungen |
| Bezahlte Freelancer-Rechnungen | Summe `paid` Rechnungen |
| Monatskosten | `expenses` im aktuellen Monat |
| Jahreskosten | `expenses` im aktuellen Jahr |
| Agenturgewinn | Gewinnberechnung Gesamt |

### Gewinnberechnung (`profit.ts`)

```
Gewinn = Kundenumsatz − Freelancerkosten − Provisionen − Agenturkosten
```

| Komponente | Berechnung |
|------------|------------|
| Kundenumsatz | Netto (`subtotal_cents`) bezahlter Kundenrechnungen im Zeitraum |
| Freelancerkosten | Netto bezahlter Freelancer-Rechnungen im Zeitraum |
| Provisionen | Summe `client_commission_payouts` im Zeitraum |
| Agenturkosten | Summe `expenses` im Zeitraum |

Zeiträume: Monat, Quartal, Jahr, Gesamt.

---

## Freelancer-Rechnungslogik

1. **Richtung:** Freelancer → NexAgency (Gegenrichtung zu Kundenrechnungen)
2. **Empfänger im PDF:** NexAgency, Einzelunternehmen, Hansastraße 54, 81373 München, info@nexagency.de
3. **Absender im PDF:** Freelancer-Stammdaten
4. **Inhalt:** Rechnungsnummer, Leistungsbeschreibung, Netto, MwSt, Gesamtbetrag, Zahlungsziel, IBAN des Freelancers
5. **Nummer:** `FR-YYYY-000001` via `next_freelancer_invoice_number()`
6. **PDF-Route:** `GET /api/freelancer-invoices/[id]/pdf`
7. **Design:** PDFKit + Inter-Fonts — identisches Layout-Prinzip wie `lib/dashboard/invoice-pdf.ts`

---

## Migration anwenden

```bash
supabase db push
# oder lokal:
supabase migration up
```

Nach der Migration sind alle Finanzen-Unterrouten unter `/dashboard/finance/*` verfügbar.

---

## Unveränderte Systeme (Phase 14)

- `invoices` / `invoice_items` — Kundenrechnungen
- Vertragsrechnungen (`contract_id`, `createInvoiceFromContract`)
- Retainer-System (`client_retainer_payments`, `recurring-invoices`, Cron)
- Kunden-PDF (`/api/invoices/[id]/pdf`, `invoice-pdf.ts`)
- Kundenfilterung und Client-Hub-Rechnungs-Actions
- Team-Provisionsauszahlungen (`payCommission` in bestehenden Finance-Actions)
