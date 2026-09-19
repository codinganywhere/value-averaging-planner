# Value Averaging Planner

`value-averaging-planner` is a Codex/ChatGPT skill for designing, calculating, reviewing, and maintaining inflation-aware value-averaging plans for ETFs or diversified portfolios.

It uses one native Google Sheet as the user-facing tracker. The same spreadsheet contains the dashboard, assumptions, period records, reference quotes, and calculations. A deterministic Python script provides reproducible planning, current-period recommendations, and formula cross-checks.

## Main capabilities

- Convert a target stated in today's purchasing power into a future nominal target.
- Keep expected return and inflation as separate assumptions.
- Build linear or growth-adjusted target-value paths.
- Support buy-only, full value-averaging, and tolerance-band policies.
- Apply contribution caps, sell caps, and trading-lot rounding.
- Retrieve reference prices with `GOOGLEFINANCE` and fall back to a manual price.
- Preserve actual transaction prices instead of rewriting history with live quotes.
- Create or update a native Google Sheet with an in-file dashboard.
- Audit value-averaging formulas and explain path deviations.

## Installation

The repository root is the skill package (it contains SKILL.md). Install it through your environment's personal-skill installation workflow. A local Codex installation does not prove that another ChatGPT conversation can access its files. Verify actual skill/script access in each environment.

The Google Sheets workflow requires a connected Google Drive/Google Sheets capability with permission to create or edit the target spreadsheet.

## Example prompts

```text
Use $value-averaging-planner to create a 10-year 0050 plan. My current portfolio is NT$500,000, my target is NT$3,000,000 in today's money, inflation is 2%, and I can invest at most NT$30,000 per month.
```

```text
Use $value-averaging-planner to append this month's record to my existing Google Sheet. The actual execution price was NT$195 and I bought 100 units.
```

```text
Use $value-averaging-planner to audit the target path, current-value handling, sell proceeds, and return formulas in this spreadsheet.
```

## Deterministic calculator

Rates are decimals: `0.06` means 6%.

```bash
python scripts/value_averaging.py plan \
  --goal 3000000 \
  --initial-value 500000 \
  --periods 120 \
  --annual-inflation 0.02 \
  --goal-basis today_money \
  --path-type growth_adjusted \
  --annual-growth 0.06
```

Run tests:

```bash
python -m unittest discover -s tests -v
```

Validate the skill package with the `quick_validate.py` script bundled with the platform's `skill-creator` skill.

## Repository layout

```text
SKILL.md                         Skill entrypoint and operating rules
VERSION                          Current package version
RELEASE_NOTES.md                 Version history
agents/openai.yaml               User-facing metadata
scripts/value_averaging.py       Deterministic calculation engine
references/methodology.md        Financial definitions and formulas
references/google-sheets.md      Native Google Sheets schema and formulas
tests/test_value_averaging.py    Calculation tests
```

## Important limitations

- `GOOGLEFINANCE` is reference data and may be delayed or unavailable for a security or attribute.
- A live quote is not an execution price. Record the actual transaction price separately.
- Value averaging can demand unusually large contributions after a market decline. A cap can make the original path infeasible.
- Calculated suggestions are planning outputs, not trade execution or guaranteed investment outcomes.

## Version

Current version: `0.2.0`. See [RELEASE_NOTES.md](RELEASE_NOTES.md).

## Native Google Sheets template (0.2.0)

1. Create a blank Google spreadsheet. Open Extensions → Apps Script.
2. Paste `assets/GoogleSheetsTemplate.gs` into the bound project, save, and run `createValueAveragingTemplate`. Authorize spreadsheet access if prompted.
3. Complete blue setting cells, including the fixed start date/value and initial holdings. Optional historical net contribution must remain blank if unknown.
4. In `每期紀錄`, enter period B, date C, and a fixed reference-price snapshot D in the next prepared row. Enter actual price E, signed actual units L, fees M and cash dividends N after a trade. Blank actual units mean zero trades; suggestions never become trades automatically.
5. Do not insert/delete/sort ledger rows. There are initially 120 prepared rows. The bound edit trigger attempts to add another 120 near the end; the `價值平均投資` menu provides explicit extension if needed. New rows within the prepared range calculate without AI or running Python.

The template is native Google Sheets formulas, not an Excel approximation. Installing the Skill does not deploy this script or create a live spreadsheet. Formula protections show warnings, not access-control enforcement. Apps Script installation is a one-time step; Python is optional for cross-checking.

`GOOGLEFINANCE` appears only on the quote tab. Copy reference prices as VALUES into the ledger; historical rows do not change with live quotes. Quote availability is not guaranteed. The ledger is single-security, excludes broker cash and assumes all trade settlement is external. Net contribution = buys − sales + fees − cash dividends. Dividend reinvestment is recorded as both a dividend and actual purchased units. An initial cost figure must not be substituted for unknown historical net contributions.

Amounts are in one currency. The Python path rounds target amounts to two decimal places; adjustments use Decimal arithmetic. The native template supports prices up to six decimals and portfolio/target/trade amounts up to 1 billion currency units. Caps limit gross trade notional, excluding fees. `--initial-value` is canonical; `--current-value` remains a deprecated alias meaning the same fixed initial value.

Validation: run `python -m unittest discover -s tests -v` and `node tests/test_template.cjs`. Local tests do not certify Classic access or Google Sheets server recalculation. No historical backtest, XIRR, cash reserve budgeting or automatic brokerage execution is provided.
