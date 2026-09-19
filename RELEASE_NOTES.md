# Release notes

## 0.2.1 — 2026-09-19

- Add task-specific opening plans and concrete user-visible progress at stage transitions.
- Add truthful status, blocker and completion reporting, with examples for planning, period updates, calculations and audits.
- Distinguish assistant progress messages from application activity indicators; no fabricated percentages or execution claims.
- Calculation behavior and template formulas are unchanged.

## 0.2.0 — 2026-09-19

- Capability-based routing; pure explanations do not require Python. Resolve scripts from the actual skill resource location.
- Add a complete bound Apps Script native Sheets template with prepared formula rows, menu/edit-trigger extension, validation status, dashboard and a path chart.
- Separate fixed initial market value/holdings from current valuation. Preserve reference-price snapshots.
- Decimal trade sizing and finite/integer input validation; optional holdings-aware sell sizing. Clarify gross caps and missing-price behavior.
- Add regression cases for purchases, sales, missing quotes, caps, precision and invalid input, plus template construction checks.
- Preserve `--current-value` as an alias for `--initial-value`.
- Template setup is explicit; no live spreadsheet deployment or Classic end-to-end verification is implied. Existing v0.1.0 spreadsheets need a reviewed migration.



## 0.1.0 — 2026-09-19

Initial release.

- Added inflation-aware nominal and today's-money targets.
- Added linear and growth-adjusted target-value paths.
- Added buy-only, full value-averaging, and tolerance-band sell policies.
- Added contribution caps, sell caps, tolerance bands, and lot-size rounding.
- Added deterministic Python plan and period calculations with unit tests.
- Added a native Google Sheets design with an in-workbook dashboard.
- Added `GOOGLEFINANCE` reference-price handling, manual fallback, and historical-price safeguards.
- Added append-only record, duplicate-check, formula-protection, and verification rules.
