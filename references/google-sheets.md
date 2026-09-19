# Native Google Sheets template 0.2.0

## Source and installation

`assets/GoogleSheetsTemplate.gs` is the authoritative complete native implementation. It contains settings, quote formulas, all ledger formulas, a dashboard, validation status, formatting, warning protections and row extension. Follow README installation when Apps Script deployment is unavailable. Never claim a Sheet was created merely because the template file exists. Use available Sheets tools and the platform creation workflow when authorized, translating the bundled formulas faithfully.

## Tabs and inputs

One workbook: 投資儀表板 / 策略設定 / 每期紀錄 / 行情資料 / 計算區.
Settings B2 ticker, B3 exchange, B4 fixed start date, B5 **fixed initial value V0**, B6 terminal goal, B7 basis, B8 periods, B9 frequency, B10 nominal path growth, B11 inflation, B12 path type, B13 sell policy, B14 gross buy cap, B15 gross sell cap, B16 tolerance, B17 lot, B18 manual live quote, B19 **initial units**, B20 optional historic net contribution, B21 fixed plan ID, B22 version, B23 settlement convention.

Ledger editable columns: B period (1..n), C valuation date, D fixed reference quote, E execution price, L signed actual units, M fees, N cash dividends, T notes. All other columns are formulas. Empty L means no trade, not acceptance of the recommendation. Periods must increase; dates must be nondecreasing. Duplicate periods and overselling block the row. Input rows may have gaps; formulas carry forward the previous valid holdings, but prior invalid nonempty rows block following rows until corrected.

A record is active when C is populated. D is a manually entered/snapshotted value, NEVER a live historical formula. E is required for nonzero actual trades. U contains the row validation result. Invalid/missing-price rows show a message and suppress recommendations and accounting; they do not produce a fabricated zero-price result. Correct invalid rows before entering subsequent ones.

## Automatic formulas

120 rows are prepared initially. Enter the next empty prepared row without copying formulas or calling AI. The bound `onEdit` trigger extends near the end, and the menu can explicitly add 120 rows. AI/API edits do not fire the user edit trigger: check capacity before append and run the extension or copy the exact relative formulas first. Do not insert, delete or sort ledger rows. Warning protections are not hard access controls.

`rowFormulas(row)` defines all calculated columns. Targets use the fixed V0 and terminal goal, rounding to cents. Integer micro-currency unit division avoids floating-point lot-boundary errors for supported prices (maximum 6 decimals). The supported amount ceiling is 1 billion per target/portfolio/trade. Outside this range, block and require a different numeric implementation.

## Cash-flow convention

Portfolio value is the security only. All buy/sell settlement is treated as external, and dividends are distributed externally. O = actual units × execution price + fees − dividends. To reinvest a dividend, record both its cash amount and the actual bought units. Do not add dividend value twice. R remains blank when B20 is unknown. No cash-reserve balance or XIRR is implemented.

## Verification and migration

Test purchases, sales, caps (including zero), missing prices, empty rows, duplicate periods, negative holdings, first-row initial positions and next-row carry-forward. Inspect formula errors and chart after native creation. Local construction tests are not native Sheets recalculation tests.

Existing v0.1.0 sheets must be copied before migration. Confirm fixed V0, initial units, historic net contribution and snapshot history. Never relabel an updating current-value cell as V0 without confirming the original starting value. Re-read destination inputs and check period IDs before writing. Verify saved inputs, U status and headline outputs after append. Installing/updating this Skill alone changes no user spreadsheets.
