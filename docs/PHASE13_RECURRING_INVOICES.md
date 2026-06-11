# Phase 13 – Automatic Recurring Contract Invoices

## Ziel

Aktive Retainer-Verträge werden täglich automatisch abgerechnet. Bestehende Rechnungslogik, PDF-Generierung, Kundenfilterung und Finance-KPIs bleiben erhalten.

## Migration

**Datei:** `supabase/migrations/20250618120000_phase13_recurring_invoices.sql`

### `clients` (neue Felder)

| Spalte | Typ | Default |
|---|---|---|
| `billing_cycle` | `monthly \| quarterly \| yearly` | `monthly` |
| `next_invoice_date` | `DATE` | `NULL` |
| `last_invoice_date` | `DATE` | `NULL` |
| `auto_invoice_enabled` | `BOOLEAN` | `false` |

### `invoices` (neue Felder)

| Spalte | Typ | Beschreibung |
|---|---|---|
| `invoice_type` | `setup \| retainer \| manual` | Rechnungstyp |
| `billing_period_year` | `INT` | Abrechnungsjahr |
| `billing_period_month` | `INT` | Abrechnungsmonat (bzw. Periodenstart) |

**Duplikatschutz:** Unique-Index auf `(contract_id, billing_period_year, billing_period_month)` für `invoice_type = 'retainer'`.

### Backfill

Aktive Retainer-Verträge (`contract_start_date` + Retainer > 0):

- `billing_cycle = monthly`
- `auto_invoice_enabled = true`
- `next_invoice_date = heute` (nur wenn noch leer)

## Geänderte / neue Dateien

| Datei | Änderung |
|---|---|
| `lib/dashboard/billing-cycle.ts` | Periodenlogik, Retainer-Betrag, Datumsfortschreibung |
| `lib/dashboard/invoice-create.ts` | Zentrale Rechnungserstellung (manuell + Cron) |
| `lib/dashboard/recurring-invoices.ts` | `generateRecurringInvoices()` Engine |
| `lib/dashboard/recurring-invoices.test.ts` | Unit-Tests |
| `lib/dashboard/invoices.ts` | `invoice_type`, Periodenfelder, `resolveInvoiceType()` |
| `lib/dashboard/finance.ts` | Retainer-KPIs (MRR, aktive Retainer, …) |
| `lib/dashboard/constants.ts` | `BILLING_CYCLES`, `INVOICE_TYPES` |
| `lib/dashboard/types.ts` | Billing-Felder, erweiterte `FinanceStats` |
| `lib/dashboard/clients.ts` | Billing-Felder im Detail-Mapping |
| `lib/dashboard/retainer-data.ts` | Revenue-Select erweitert |
| `app/api/cron/recurring-invoices/route.ts` | Cron-Endpoint |
| `vercel.json` | Täglicher Cron 00:05 UTC |
| `app/dashboard/clients/[id]/actions.ts` | `updateAutoInvoiceEnabled`, Setup-Typ |
| `components/dashboard/ClientDetailPageClient.tsx` | Retainer-Abrechnung UI |
| `components/dashboard/InvoiceTable.tsx` | Typ-Spalte (Setup/Retainer) |
| `components/dashboard/FinancePageClient.tsx` | Neue Retainer-KPIs |

## Engine: `generateRecurringInvoices()`

Bedingungen pro Vertrag:

1. `contract_start_date` gesetzt
2. `monthly_retainer_cents > 0` (Fallback: `monthly_revenue_cents`)
3. `auto_invoice_enabled = true`
4. `next_invoice_date <= heute`

Ablauf:

1. Duplikatprüfung für `(contract_id, billing_period_year, billing_period_month)`
2. Rechnung: `draft`, Netto = Retainer, MwSt 19 %, Fälligkeit +14 Tage
3. `last_invoice_date` und `next_invoice_date` fortschreiben (+1/+3/+12 Monate)

## Cron-Workflow

### Vercel (Standard)

`vercel.json`:

```json
{ "path": "/api/cron/recurring-invoices", "schedule": "5 0 * * *" }
```

Vercel sendet `Authorization: Bearer <CRON_SECRET>`.

### Umgebungsvariable

```
CRON_SECRET=<starkes-geheimnis>
```

### Manueller Test (nur Entwicklung)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/recurring-invoices
```

### Supabase Cron (Alternative)

HTTP-Call auf `/api/cron/recurring-invoices` mit Header `x-cron-secret` oder `Authorization`.

## Sicherheit

- Cron nur mit `CRON_SECRET`
- Rechnungen: `client_id` + `contract_id` gebunden
- Vertragsrechnungen: bestehende Kundenfilterung unverändert
- PDF: unverändert über `/api/invoices/[id]/pdf`

## UI

### Verträge-Tab → Retainer-Abrechnung

- Abrechnungsintervall, nächste/letzte Rechnung
- Status-Badge Aktiv/Pausiert
- Schalter „Automatische Rechnungen aktiv“

### Vertragsrechnungen

- Spalte **Typ**: Setup-Rechnung / Retainer-Rechnung

### Finanzen

- MRR (bestehend, jetzt aus aktiven Retainern)
- Aktive Retainer
- Retainer-Umsatz diesen Monat
- Offene / überfällige Retainer-Rechnungen
