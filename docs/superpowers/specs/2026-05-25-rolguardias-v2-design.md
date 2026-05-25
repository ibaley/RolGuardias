# RolGuardias v2 Design

Date: 2026-05-25
Status: Approved for spec by Isaac

## Goal

Build a modern, simple, powerful version of RolGuardias for the CPR ABC guard schedule.

The app should make the normal workflow fast: update the two campus lists, choose a start date and schedule length, generate the role, verify distribution, and export a clean PDF/CSV.

## Core Rule

Each campus rotates independently.

For each campus list:

- Week 1 assigns person 1 as `1er llamado` and person 2 as `2do llamado`.
- On the next week, the previous `2do llamado` becomes `1er llamado`.
- The next person in the list becomes `2do llamado`.
- When the list reaches the end, it wraps back to the first person.

The table display keeps the historical column order:

1. Fecha
2. Santa Fe - 2do llamado
3. Santa Fe - 1er llamado
4. Observatorio - 2do llamado
5. Observatorio - 1er llamado

## Initial Data

Santa Fe starts with 16 integrantes:

```text
GERARDO FERNÁNDEZ SOBRINO
DAVID DE RUNGS BROWN
EDUARDO VILLASENOR VILLALPANDO
ANA MENENDEZ SKERTCHLY
ISAAC BALEY SPINDEL
SERGIO GONZÁLEZ LAZERRI
PILAR CEDILLO LEY
RODRIGO MUÑOZ OLVERA
SANTIAGO GARCIA CASAS
PABLO DANIEL MURAKAMI MORISHIGUE
MAURICIO ERAZO FRANCO
DIEGO COLIN VEGA
GABRIEL BARRERA GARCÍA
ERIKA DE LA CONCHA BLANKENAGEL
ALEJANDRO COSTA
DANIEL DE LUNA
```

Observatorio starts with 15 integrantes:

```text
FEDERICO IÑIGO ARROYO
MARIO VELEZ
JONATHAN FIGUEROA
ANDREA CARRILLO
MAX SIROTA
MARTÍN PÉREZ VASCONCELOS
ROGELIO RINCÓN LOZANO
UBALDO CARPINTEYRO
LOURDES ORTEGA CAUDILLO
FERNAN AYALA UGALDE
ULISES FLORES HERNANDEZ
EDMUNDO GUADARRAMA PEREZ
ROBERTO MARTÍNEZ MEJORADA
FRANCISCO SUAREZ MENENDEZ
MIGUEL ÁNGEL PÉREZ DE LEÓN
```

Francisco Said Lemus is excluded.

## Product Shape

The approved direction is approach B: a clean generator with real validation.

The main screen contains:

- Schedule controls: start date and number of weeks.
- Two editable campus list inputs, optimized for pasting one name per line.
- Generated table preview.
- Search/filter for a doctor name.
- Summary counts per doctor and campus.
- Validation alerts.
- Export buttons.

The efficient editing path is paste-first. The user can paste a campus list, and the app normalizes blank lines and whitespace. Fine-grained table/drag editing is not required for v2.

## Validation

The app should show clear warnings before export when:

- A campus has fewer than 2 people.
- A name appears twice in the same campus list.
- A name appears in both campus lists.
- The schedule was generated with empty or invalid dates.

The app should show distribution counts after generation:

- Count of `1er llamado` assignments per person.
- Count of `2do llamado` assignments per person.
- Total count per person.

These counts are informational; uneven distribution can happen when the number of weeks is not a multiple of the campus list length.

## Exports

The app exports:

- PDF: compact landscape table, similar to the 2025 PDF.
- CSV: schedule rows for Excel/Sheets review.

Optional later export:

- ICS calendar file for calendar import.

ICS is not required for the first v2 implementation.

## Architecture

Use a small static web app suitable for GitHub Pages.

Separate code into:

- Schedule engine: pure functions for parsing names, validating rosters, generating rows, and producing summary counts.
- UI layer: DOM rendering, controls, state, search, and export actions.
- Export helpers: PDF and CSV generation.

The schedule engine must be testable without the browser.

## Testing

Write tests before implementation for:

- Rotation rule: week-to-week `2do` becomes next week `1er`.
- Independent campus rotation.
- Wraparound at the end of each campus list.
- Counts by person and role.
- Validation: duplicate names, cross-campus duplicate, too-few names, invalid start date.
- CSV export data shape.

Manual browser verification should confirm:

- The page loads on GitHub Pages/local static server.
- The default lists are populated.
- The generated schedule matches the rule.
- Search filters visible rows.
- PDF and CSV downloads work.

## Out Of Scope For v2

- Login or server-side storage.
- Multi-user collaboration.
- Special vacation rules.
- Manual swaps and exceptions.
- Replit deployment.
- Drag-and-drop roster editing.

These can be added later if the schedule maintenance workflow needs them.
