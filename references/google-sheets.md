# Native Google Sheets design

Read this file before creating or changing the plan spreadsheet.

## Workbook topology

Use one Google Spreadsheet with these tabs in order:

1. `投資儀表板`
2. `策略設定`
3. `每期紀錄`
4. `行情資料`
5. `計算區`

Keep the dashboard in the same spreadsheet. This avoids cross-file permissions and `IMPORTRANGE`, and lets manual entries and AI updates recalculate the same outputs.

## Strategy settings

Use columns A:C for label, value, and guidance.

| Cell | Label | Type |
| --- | --- | --- |
| B2 | ETF代號 | text, for example `0050` |
| B3 | 交易所代號 | text, for example `TPE` |
| B4 | 起始日期 | date |
| B5 | 目前投資組合市值 | currency |
| B6 | 目標金額 | currency |
| B7 | 目標金額基準 | dropdown: `today_money`, `nominal` |
| B8 | 投資期數 | positive integer |
| B9 | 每年期數 | positive integer, default 12 |
| B10 | 年化路徑成長率 | percentage |
| B11 | 年化通膨率 | percentage |
| B12 | 目標路徑 | dropdown: `linear`, `growth_adjusted` |
| B13 | 賣出政策 | dropdown: `buy_only`, `full`, `band` |
| B14 | 單期投入上限 | currency or blank |
| B15 | 單期賣出上限 | currency or blank |
| B16 | 容忍區間 | percentage, used by `band` |
| B17 | 最小交易單位 | positive integer |
| B18 | 手動價格覆寫 | currency or blank |

Do not combine expected return and inflation. Convert both geometrically when periodic values are needed.

## Market data

Store the active reference price in `行情資料!B2`. Prefer the manual override when supplied:

```gs
=IF('策略設定'!B18<>"",'策略設定'!B18,IFERROR(GOOGLEFINANCE('策略設定'!B3&":"&'策略設定'!B2,"price"),""))
```

Optional delay and last-trade metadata:

```gs
=IFERROR(GOOGLEFINANCE('策略設定'!B3&":"&'策略設定'!B2,"datadelay"),"")
```

```gs
=IFERROR(GOOGLEFINANCE('策略設定'!B3&":"&'策略設定'!B2,"tradetime"),"")
```

Show a visible `價格缺失` warning when the active reference price is blank or nonpositive.

## Period record table

Use one row per valuation and trade decision. Do not insert blank rows inside the record table.

| Column | Field | Ownership |
| --- | --- | --- |
| A | 紀錄ID | calculated |
| B | 投資期數 | calculated or validated input |
| C | 評價日期 | input |
| D | 參考價格 | calculated reference or fixed snapshot |
| E | 實際成交價格 | input |
| F | 期初持股 | calculated |
| G | 本期目標市值 | calculated |
| H | 交易前市值 | calculated |
| I | 目標差額 | calculated |
| J | 限制後建議金額 | calculated |
| K | 建議交易股數 | calculated |
| L | 實際交易股數 | input; negative means sale |
| M | 手續費與交易稅 | input or calculated |
| N | 股息收入 | input |
| O | 本期外部淨現金流 | calculated |
| P | 期末持股 | calculated |
| Q | 期末市值 | calculated |
| R | 累計淨投入 | calculated |
| S | 期末路徑偏差 | calculated |
| T | 備註 | input |

Use formula columns or a protected calculation tab so a newly appended input row receives formulas automatically. Test blank rows, first row, a purchase, a sale, a cap-binding purchase, and a missing quote before rollout.

For a past valuation date, a reference closing price may use:

```gs
=IF(C2="","",IF(C2=TODAY(),'行情資料'!$B$2,IFERROR(INDEX(GOOGLEFINANCE('策略設定'!$B$3&":"&'策略設定'!$B$2,"close",C2),2,2),"")))
```

Do not use that reference field as the actual execution price. Actual prices remain user-entered or fixed values.

## Dashboard

Put the dashboard first and keep it output-focused. Show:

- active ticker, valuation date, active reference price, price source, and delay/status;
- current holdings and estimated market value;
- current target value, raw gap, constrained recommendation, units, and residual deviation;
- terminal goal in both the user's selected basis and nominal currency;
- cumulative buys, sale proceeds, fees/taxes, dividends, net contributions, and current value;
- path completion percentage and an explicit missing-input or infeasibility warning.

Charts:

1. target value versus actual market value by period;
2. periodic net contribution;
3. cumulative net contribution versus portfolio market value.

## Protections and validation

- Use a distinct input style for editable cells.
- Protect formulas, the dashboard output range, `行情資料`, and `計算區`.
- Validate dropdowns and nonnegative limits; allow negative values only where a sale is meaningful.
- Prevent actual sale units from exceeding available units.
- Use a stable record ID and check period/date duplicates before appending.
- Re-read the destination row before writing. Verify the saved row and headline dashboard outputs afterward.

## AI append workflow

1. Resolve the exact Spreadsheet ID and visible tab names.
2. Read settings and the final bounded record rows.
3. Detect a duplicate record ID or period/date.
4. Obtain the reference quote; never invent a missing value.
5. Run the deterministic period calculation.
6. Append input values without overwriting calculated columns.
7. Read back the row and dashboard values.
8. Report the recommendation, constraints, residual deviation, and price source.
