---
name: value-averaging-planner
description: Plan, calculate, review, and maintain inflation-aware value-averaging investment plans in native Google Sheets. Use for ETF target-value paths, periodic buy or sell recommendations, contribution limits, portfolio-path reviews, backtests, or audits of value-averaging spreadsheet logic. Do not use for general stock picking, price prediction, or short-term trading signals.
metadata:
  version: "0.1.0"
  short-description: Inflation-aware ETF value-averaging plans
---

# Value Averaging Planner

Build decisions from a predetermined portfolio-value path. Keep routine inputs and transparent calculations in one native Google Sheet; use the deterministic script for plan generation, difficult constraints, scenario work, and independent checks.

## Route the request

- For a new plan, collect the minimum planning inputs, calculate the path, then create one native Google Sheet containing the dashboard, settings, period records, market data, and protected calculation area.
- For an existing plan, resolve the exact Google Spreadsheet ID, inspect metadata and the bounded ranges involved, then append or update only the authorized records.
- For a calculation or explanation without a spreadsheet change, run `scripts/value_averaging.py` and explain the inputs, result, and binding constraint.
- For a spreadsheet audit, trace target value, pre-trade value, adjustment, units, cumulative cash flows, and reported return back to their inputs. Report defects before changing them.

Read [references/methodology.md](references/methodology.md) whenever calculating, comparing, or auditing the method. Read [references/google-sheets.md](references/google-sheets.md) whenever creating or changing the native Google Sheet.

## Required decisions

Do not silently infer a choice that materially changes the plan. Establish:

- target amount and whether it is stated in today's purchasing power or future nominal currency;
- investment horizon and contribution frequency;
- current portfolio market value and holdings;
- annual inflation assumption;
- target-path type: `linear` or `growth_adjusted`;
- sell policy: `buy_only`, `full`, or `band`;
- contribution cap, sell cap, tolerance band, and trading lot size when applicable.

If the user provides an annual expected return, keep it separate from inflation. Never average expected return and inflation. Convert annual rates to periodic rates geometrically.

## Deterministic calculation

Use `scripts/value_averaging.py` for plan and period calculations. Treat rate inputs as decimals: `0.06` means 6%.

Example plan:

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

Example current-period recommendation:

```bash
python scripts/value_averaging.py period \
  --goal 3000000 \
  --current-value 500000 \
  --periods 120 \
  --period 18 \
  --market-value 735000 \
  --price 195 \
  --annual-inflation 0.02 \
  --goal-basis today_money \
  --path-type growth_adjusted \
  --annual-growth 0.06 \
  --sell-policy buy_only \
  --contribution-cap 30000 \
  --lot-size 1
```

Keep the returned target, raw gap, policy-adjusted amount, rounded units, notional amount, and residual deviation distinct.

## Google Sheets operating rules

- Put the dashboard in the first tab of the same spreadsheet as the source records.
- Use `GOOGLEFINANCE` only for reference market data. Prefer an explicit exchange prefix and provide a manual override.
- Never let a live quote rewrite historical transaction prices. Store actual execution prices as user-entered or fixed snapshot values.
- Keep input cells editable and calculated columns protected. Do not overwrite formulas when appending a record.
- Treat period records as append-only by default. Before appending, check the record ID and period/date for duplicates.
- Re-read the target range immediately before a write and verify the written row and headline dashboard values afterward.
- When `GOOGLEFINANCE` is unavailable, delayed, or blank, surface the missing price and use an explicit manual value. Do not invent a quote.

## Reporting contract

For a period recommendation, report:

1. valuation date and price source;
2. target value and pre-trade market value;
3. raw path gap;
4. active sell policy and cash/lot constraints;
5. recommended units and notional amount;
6. estimated post-trade value and remaining path deviation;
7. any missing, stale, or infeasible input.

For a plan, also report the inflation-adjusted terminal target. When a market scenario or historical series is available, report the largest modeled contribution and whether the stated cap makes that simulated path infeasible. Do not present an expected return as guaranteed. Do not place trades or claim that a recommendation is personalized regulated financial advice.

## Version

The package version is declared in frontmatter and `VERSION`. Changes are recorded in `RELEASE_NOTES.md`.
