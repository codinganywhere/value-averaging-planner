# Methodology

Read this file before calculating, comparing, or auditing a value-averaging plan.

## 1. Rate conventions

Store annual rates as decimals. Convert an effective annual rate `a` to a periodic rate with `p` periods per year:

```text
r_period = (1 + a)^(1/p) - 1
```

Do not divide an annual effective rate by 12 unless the user explicitly supplied a nominal annual rate defined that way. Never average return and inflation.

The real return corresponding to nominal return `r` and inflation `i` is:

```text
r_real = (1 + r) / (1 + i) - 1
```

Use real return for purchasing-power comparisons, not as a replacement for the portfolio's nominal market return.

## 2. Inflation treatment

The target basis is mandatory.

- `nominal`: the entered target is already the currency amount required at the end date. Do not inflate it again.
- `today_money`: the entered target is stated in today's purchasing power. Convert it to a terminal nominal target.

For `n` periods and periodic inflation `i_p`:

```text
terminal_nominal_goal = today_money_goal * (1 + i_p)^n
```

Display both the original purchasing-power target and the terminal nominal target.

## 3. Target-value paths

Let `V0` be current portfolio market value, `G` the terminal nominal goal, `n` total periods, and `t` the current period from 0 through `n`.

### Linear path

```text
V_t = V0 + (G - V0) * t / n
```

This produces a constant target-value increment before market-path effects.

### Growth-adjusted path

Let `g` be the periodic path growth assumption. Calculate the base periodic increment:

```text
C = (G / (1 + g)^n - V0) / n
```

Then:

```text
V_t = (V0 + C * t) * (1 + g)^t
```

This path starts at `V0` and ends at `G`. `g` shapes the path; it is not a guaranteed return. If `C` is negative, the current portfolio compounded at `g` already exceeds the terminal target. Surface that condition instead of hiding it.

## 4. Period adjustment

Let `M_t` be the portfolio market value immediately before the period's trade:

```text
raw_gap = V_t - M_t
```

Policies:

- `buy_only`: trade amount is `max(raw_gap, 0)`.
- `full`: trade amount is `raw_gap`; a negative amount is a sale.
- `band`: trade only when `abs(raw_gap) / V_t` exceeds the tolerance band. Outside the band, use the full raw gap before caps.

Apply a positive contribution cap to buys and a positive sell cap to the absolute value of sales. Then convert the capped amount to trade units without exceeding the cap:

```text
units = sign(amount) * floor(abs(amount) / price / lot_size) * lot_size
notional = units * price
```

The estimated post-trade market value is:

```text
post_trade_value = M_t + notional
residual_deviation = V_t - post_trade_value
```

Track fees and taxes separately. Do not call gross sale proceeds profit; realized profit requires a cost-basis method.

## 5. Cash flows and performance

Keep these values distinct:

- gross buys;
- gross sale proceeds;
- fees and taxes;
- dividends and distributions;
- net external cash flow;
- ending portfolio market value.

Use dated cash flows for XIRR. A simple return based only on current value minus net contribution can become unstable when net contributions approach zero. Do not label it as realized profit.

## 6. Feasibility and warnings

Flag at least the following:

- contribution cap binds and leaves a positive residual deviation;
- sell cap binds and leaves a negative residual deviation;
- missing or nonpositive reference price;
- requested sale exceeds available units;
- terminal goal is below the modeled current-value growth path;
- `GOOGLEFINANCE` is blank or stale;
- target basis is unspecified;
- historical execution price is linked to a live quote rather than stored as a value.
