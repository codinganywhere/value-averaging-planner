# Progress reporting playbook

Report actions and observed results, not internal deliberation. Examples below are illustrative; replace numbers and dates only with actual task inputs or verified outputs.

## Choose stages by request

| Request | Suggested stages |
| --- | --- |
| New plan / Sheet | Confirm inputs → check calculation and Sheets access → calculate inflation and target path → build workbook and formulas → verify/read back → deliver |
| Append period | Read settings and last records → check period duplicates and quote → calculate capped/rounded adjustment → append authorized actual inputs → read back row and dashboard |
| Calculation only | Confirm inputs and available execution → calculate → check constraints → report |
| Audit | Read relevant ranges → trace formulas → reproduce defects → report evidence and proposed fixes; change only when authorized |
| Explanation | Explain relevant concepts directly; add a short outline only if it helps |

## Initial message

Example:「我會先確認投資參數與報價，再計算含通膨的目標路徑，最後建立試算表並核對新增紀錄的公式。」
For longer work, expose 3–6 applicable stages as a checklist. Use sequential step numbering only when stages are actually sequential; parallel tasks should have separate statuses.

## During execution

Use one or two sentences: current stage + concrete work + verified result + next action. Do not repeat all previous messages or send empty heartbeat updates.

- 「進度 2/5｜參數已確認：共120期，目標採未來名目金額，因此不再加計通膨。接著計算每期目標市值。」 Only use if these are the actual confirmed inputs.
- 「進度 3/5｜正在填入『每期紀錄』的目標市值、建議股數與累計投入公式；完成後會測試買入與賣出。」 Only use after starting the actual write.
- 「已完成本期計算：建議投入受每期上限限制，仍有目標差額。接著檢查紀錄是否重複。」 Supply actual amounts if calculated.
- 「公式已寫入，正在重新讀取新增列與儀表板，確認結果一致。」 Use only after a successful write response.
- 「目前受阻：參考報價為空白，尚未計算交易股數。可以繼續檢查歷史公式；本期計算需要有效價格。」 Do not silently substitute zero.

A stage count (2/5) is a checklist position, not 40% runtime completion. No fabricated progress bars or ETA. If the host has no separate progress channel, use its available user-visible messaging; do not claim an unavailable streaming capability.

## Completion

State what was actually delivered and tested. Examples: a calculated plan, a saved Sheet URL, a verified appended row, or a defect report. Explicitly distinguish local calculation tests, template construction checks and native Google Sheets recalculation. When unfinished, list the specific remaining action and why; do not mark the overall task complete.
