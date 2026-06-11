# Team & Rollenverwaltung — NexAgency CRM

## Rollenmodell

| Rolle | DB-Wert | Beschreibung |
|-------|---------|--------------|
| Super Admin | `super_admin` | Vollzugriff inkl. Team, Finanzen, Rollen |
| Administrator | `admin` | Kunden, Leads, Termine, Aktivitäten, Team einsehen/verwalten (kein Super-Admin-Management) |
| Sales Manager | `sales_manager` | Leads, Kunden, Termine, Aktivitäten — keine Finanzen, kein Team |
| Mitarbeiter | `employee` | Nur eigene Leads, Kunden, Termine, Aktivitäten |
| Freelancer | `freelancer` | Wie Mitarbeiter (RLS-identisch) |

### Berechtigungsmatrix (serverseitig)

| Funktion | Super Admin | Admin | Sales Manager | Mitarbeiter |
|----------|:-----------:|:-----:|:-------------:|:-----------:|
| Team verwalten | ✅ | ✅* | ❌ | ❌ |
| Finanzen / Provisionen | ✅ | ✅ | ❌ | ❌ |
| Alle Leads/Kunden | ✅ | ✅ | Eigene + erstellte Leads | Nur eigene |
| Rollen ändern | ✅ | ✅** | ❌ | ❌ |

\* Admin darf keine Super-Admins bearbeiten, deaktivieren oder löschen.  
\** Admin kann keine `super_admin`-Rolle vergeben.

Implementierung: `lib/auth/permissions.ts`, RLS in Supabase, `requireManagement()` / `requireFinanceAccess()`.

---

## Zuweisungsfelder (Phase 3 & 4)

Sprint-Spezifikation nennt `assigned_user_id`. In der DB:

| Entität | Spalte | Semantik |
|---------|--------|----------|
| Lead | `owner_id` | Verantwortlicher Mitarbeiter |
| Kunde | `responsible_member_id` | Verantwortlicher Mitarbeiter |
| Termin | `assigned_user_id` | Zugewiesener Mitarbeiter |

UI-Label überall: **„Verantwortlicher Mitarbeiter“** (`lib/dashboard/assignments.ts`).

---

## Provision (Phase 5)

- `profiles.commission_rate` — individueller Satz pro Mitarbeiter (0–100 %)
- Berechnung: `setup_fee_cents × commission_rate / 100` (nur Setup, nicht Retainer)
- Gespeichert auf Kunde: `commission_total_cents`, `commission_paid_cents`, `commission_outstanding_cents`
- **Rate-Änderung:** Erhöht nur künftige `commission_total` — bestehende Auszahlungen (`commission_paid_cents`, `client_commission_payouts`) bleiben unverändert
- Auszahlungen: `client_commission_payouts` + `payCommission()` Server Action

---

## Performance-Datenbasis (Phase 6)

`lib/dashboard/member-performance.ts`:

```typescript
getMemberPerformanceSnapshots() → {
  leadsCount, clientsCount, revenueCents,
  commissionTotalCents, commissionPaidCents, commissionOutstandingCents
}
```

Basiert auf `getTeamPerformanceStats()` — UI unter `/dashboard/performance` bereits vorhanden.

---

## Migrationen (Team-Sprint)

| Datei | Inhalt |
|-------|--------|
| `20250610100000_create_profiles_and_auth.sql` | profiles, Auth-Trigger |
| `20250610130000_team_member_status.sql` | status pending/active/deactivated |
| `20250610170000_phase4a_roles_ownership.sql` | 5-Rollen-System, owner_id, responsible_member_id, RLS |
| `20250611180000_phase4b_revenue_commission.sql` | commission_rate auf profiles |
| `20250611230000_phase7_commission_liability.sql` | Provisions-Verbindlichkeiten |
| `20250611260000_commission_payout_history.sql` | Auszahlungshistorie |
| `20250612000000_team_roles_sales_manager.sql` | `sales` → `sales_manager`, is_field_staff(), RLS |

---

## Tabellen & Spalten (relevant)

### `profiles` (Teammitglieder)
- `full_name`, `email`, `role`, `commission_rate`, `status`, `is_active`, `activated_at`, `created_at`

### `leads`
- `owner_id` (assigned user), `created_by`, …

### `clients`
- `responsible_member_id` (assigned user), `setup_fee_cents`, commission fields, …

### `client_commission_payouts`
- `client_id`, `amount_cents`, `payout_date`, `created_at`

---

## Testplan

### Phase 1 — Team
- [ ] Team-Tabelle zeigt Name, E-Mail, Rolle, Provision %, Status, Erstellungsdatum
- [ ] Einladen mit individuellem Provisionssatz (z. B. 0 %, 50 %, 40 %)
- [ ] Bearbeiten: Name, Rolle, Provision speichern
- [ ] Deaktivieren / Reaktivieren / Löschen

### Phase 2 — Berechtigungen
- [ ] Super Admin: Zugriff auf Team + Finanzen
- [ ] Admin: Team + Finanzen, kann keinen Super Admin bearbeiten
- [ ] Sales Manager: kein `/dashboard/team`, kein `/dashboard/finance`
- [ ] Mitarbeiter: nur eigene Leads/Kunden (RLS), Redirect/Fehler bei Finance

### Phase 3 & 4 — Zuweisung
- [ ] Kunde: Dropdown „Verantwortlicher Mitarbeiter“ — nur aktive Mitglieder
- [ ] Lead: Zuweisung speichern, Mitarbeiter sieht nur eigene Leads
- [ ] Lead→Kunde: `responsible_member_id` = `owner_id`

### Phase 5 — Provision
- [ ] Setup 2.000 €, Rate 50 % → commission_total 1.000 €, paid 0, outstanding 1.000 €
- [ ] Auszahlung 500 € → paid 500, outstanding 500
- [ ] Rate auf 40 % ändern → paid bleibt 500, total/outstanding nur für neue Setup-Differenz

### Phase 6 — Performance-Daten
- [ ] `getMemberPerformanceSnapshots()` liefert aggregierte Werte pro Profil
- [ ] Performance-Seite zeigt Provision verdient / ausgezahlt / offen

### Regression
- [ ] Finance KPIs, Retainer, Auszahlungsmodal funktionieren
- [ ] Lead-Konvertierung unverändert
- [ ] Mobile Team-Tabelle lesbar (E-Mail/Provision auf Desktop)

---

## Commit (vorbereitet)

```
feat(team): sales_manager role, permissions hardening, team UI and performance data layer

- Rename sales → sales_manager with migration and RLS is_field_staff()
- Expand permissions helpers and block admin from managing super admins
- Team table: separate email/commission columns, assignment field labels
- Add member-performance snapshots and TEAM_AND_ROLES documentation
```

Anwenden: `supabase db push` nach Merge.
