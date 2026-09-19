# Value Averaging Planner

`value-averaging-planner` is a Codex/ChatGPT skill for designing, calculating, reviewing, and maintaining inflation-aware value-averaging plans for ETFs or diversified portfolios.

It uses one native Google Sheet as the user-facing tracker. The same spreadsheet contains the dashboard, assumptions, period records, reference quotes, and calculations. A deterministic Python script provides reproducible planning, current-period recommendations, scenario analysis, and formula cross-checks.

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

Copy this repository's `value-averaging-planner` folder into a supported skills directory, or install the repository through the skill installation workflow available in your Codex/ChatGPT environment.

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
  --current-value 500000 \
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

Current version: `0.1.0`. See [RELEASE_NOTES.md](RELEASE_NOTES.md).
