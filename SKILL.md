---
name: value-averaging-planner
description: Plan, calculate, review, and maintain inflation-aware value-averaging investment plans in native Google Sheets. Use for ETF target-value paths, periodic buy or sell recommendations, contribution limits, portfolio-path reviews or audits of value-averaging spreadsheet logic. Do not use for general stock picking, price prediction, or short-term trading signals.
metadata:
  version: "0.2.1"
  short-description: Inflation-aware ETF value-averaging plans
---

# Value Averaging Planner

Build decisions from a predetermined portfolio-value path. Keep routine inputs and transparent calculations in one native Google Sheet; use the deterministic script for plan generation, difficult constraints, scenario work, and independent checks.

## User-visible plan and progress (required)

Before substantive tool work, acknowledge the requested outcome in the user's language and show a short task-specific plan. Select only applicable stages from `references/progress-reporting.md`; do not recite every possible step. For a pure explanation, answer directly or give a one-sentence outline; do not force a long workflow.

Keep the user informed through visible progress messages, not solely tool activity labels. Use a plan/status tool when available, but also write concise user-facing updates. Report the stage, concrete object being processed (ticker, period, tab/range or calculation), verified findings, and the next action. Show completed / in progress / pending / blocked truthfully. At stage transitions or roughly 30–60 seconds during active work, give a useful update when execution control is available; report immediately after a long blocking call returns. Never invent a completion percentage, elapsed-time estimate, quote, tool run, write, or verification. Do not expose private reasoning, credentials or internal infrastructure.

If blocked, identify the exact missing input/capability, completed work and the smallest necessary user action. Continue independent authorized work where possible. Finish with delivered results, actual validation, links when applicable, and any pending/blocked items. A prepared template is not a deployed Sheet; a submitted write is not a verified write. These instructions govern assistant messages; they do not customize the application's built-in spinner or guarantee live updates inside a blocking tool call.

## Capability check and resource resolution

Inspect the tools exposed in THIS conversation before choosing execution. Do not infer capabilities from the labels Classic, Chat, Work, Windows, or Codex.

- Pure explanation: read the methodology and explain it without requiring Python.
- Numerical calculation: use the bundled calculator only if Python execution AND the original script are accessible. Otherwise use verified native Sheet formulas if readable, or provide the formula/input requirements and disclose that no code ran. Never invent an execution result or rewrite a substitute calculator while claiming to run the bundled script.
- Sheet operations: independently check read/write access to the exact spreadsheet. With read-only access, audit and provide changes for review; do not claim a write. Without Sheets tools, provide the bundled template installation instructions.
- Resolve this skill's root from the loader's actual resource/path metadata. Never assume the current working directory, `/root`, a Windows location, or shared storage across conversations. For filesystem execution use the verified absolute path `<skill_root>/scripts/value_averaging.py` and an available Python interpreter. For notebook execution, materialize the original bundled resource into that notebook's accessible files first; invoke it with `runpy` and explicit `sys.argv` or import the original module. Do not pass a `skill://` URI to a filesystem API. If access fails, report the exact missing capability.
- Examples below assume the working directory has explicitly been set to the verified skill root; otherwise replace the script argument with its absolute path.

## Route the request

- For a new plan, collect the minimum planning inputs, calculate the path, then create one native Google Sheet containing the dashboard, settings, period records, market data, and protected calculation area.
- For an existing plan, resolve the exact Google Spreadsheet ID, inspect metadata and the bounded ranges involved, then append or update only the authorized records.
- For a numerical calculation without a spreadsheet change, follow the capability check, then explain the inputs, result, and binding constraint. Explain concepts directly without script execution.
- For a spreadsheet audit, trace target value, pre-trade value, adjustment, units, cumulative cash flows, and reported return back to their inputs. Report defects before changing them.

Read [references/methodology.md](references/methodology.md) whenever calculating, comparing, or auditing the method. Read [references/google-sheets.md](references/google-sheets.md) whenever creating or changing the native Google Sheet.

## Required decisions

Do not silently infer a choice that materially changes the plan. Establish:

- target amount and whether it is stated in today's purchasing power or future nominal currency;
- investment horizon and contribution frequency;
- fixed plan-start market value (`initial_value`) and initial holdings; separately collect this period’s pre-trade market value and available holdings;
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
  --initial-value 500000 \
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
  --initial-value 500000 \
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

## Google Sheets template

Read `references/google-sheets.md`. Use `assets/GoogleSheetsTemplate.gs` as the complete native template implementation, including exact formulas. It builds only in a blank workbook and refuses to overwrite existing named tabs. Users enter records in prepared rows; formulas already exist. The bound script menu can extend rows; its edit trigger attempts extension near the end. Do not promise that installing this Skill alone creates a Sheet or deploys Apps Script. Apply the platform Sheets creation workflow; use the bundled formula definitions instead of inventing alternate arithmetic. Existing v0.1.0 sheets require a copy/migration with a frozen initial value and confirmed opening holdings; never overwrite in place as though schemas were identical.

## Google Sheets operating rules

- Put the dashboard in the first tab of the same spreadsheet as the source records.
- Use `GOOGLEFINANCE` only for reference market data. Prefer an explicit exchange prefix and provide a manual override.
- Never let a live quote rewrite historical transaction prices. Store actual execution prices as user-entered or fixed snapshot values.
- Keep input cells editable and formula columns protected. The bundled template uses warning-only protections (owners can override); disclose this and use restrictive protections when user roles are known. Do not overwrite formulas when appending a record.
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

The calculator supports a single security, integer units, gross trade caps excluding fees, and target paths; it does not implement a historical backtest, cash-reserve budget, multi-asset allocation, or XIRR. Do not claim these exist. For a plan, also report the inflation-adjusted terminal target. When a market scenario or historical series is available, report the largest modeled contribution and whether the stated cap makes that simulated path infeasible. Do not present an expected return as guaranteed. Do not place trades or claim that a recommendation is personalized regulated financial advice.

## Version

The package version is declared in frontmatter and `VERSION`. Changes are recorded in `RELEASE_NOTES.md`.
