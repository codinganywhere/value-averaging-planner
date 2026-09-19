/** Value Averaging Planner 0.2.1. Bound Apps Script, no network/API credentials.
 * Run createValueAveragingTemplate once in a BLANK Google spreadsheet.
 * Native formulas calculate new records; onEdit/menu extends prepared rows.
 */
const VA_VERSION = '0.2.1';
const VA_TABS = ['投資儀表板','策略設定','每期紀錄','行情資料','計算區'];
function onOpen() {
  SpreadsheetApp.getUi().createMenu('價值平均投資').addItem('建立空白模板','createValueAveragingTemplate').addItem('增加120期空白列','extendValueAveragingRows').addToUi();
}
function createValueAveragingTemplate() {
  const ss=SpreadsheetApp.getActive();
  if (VA_TABS.some(n=>ss.getSheetByName(n))) throw new Error('已有同名工作表；請在新的空白試算表建立，避免覆寫資料。');
  const sh=VA_TABS.map(n=>ss.insertSheet(n));
  const labels=[['欄位','值','說明'],
    ['ETF代號','0050','文字，保留前導零'],['交易所','TPE','報價不支援時請手動輸入'],
    ['計畫起始日期','','必填日期；建立後固定'],['計畫起始市值 V0','','必填；不隨每期更新'],
    ['期末目標金額','','必填，正數'],['目標基準','nominal','nominal / today_money'],
    ['投資期數',120,'正整數'],['每年期數',12,'正整數'],['年化路徑成長率',0.06,'名目路徑假設'],
    ['年通膨率',0.02,'今日購買力目標才增加名目目標'],['目標路徑','growth_adjusted','linear / growth_adjusted'],
    ['賣出政策','buy_only','buy_only / full / band'],['單期買入成交額上限','','空白無上限，0禁止買入；不含費稅'],
    ['單期賣出成交額上限','','空白無上限，0禁止賣出'],['容忍區間',0.05,'0至1'],['交易單位',1,'零股=1'],
    ['即時價格手動覆寫','','只影響行情頁，不改歷史快照'],['計畫起始持股','','必填，非負整數'],
    ['起始歷史淨投入','','選填；未知則累計投入不顯示'],['計畫ID',Utilities.getUuid(),'建立後固定'],
    ['模板版本',VA_VERSION,'不要用舊版欄位直接覆蓋'],['帳務模式','交易款外部結算','不追蹤現金餘額；股息再投入請包含在實際買入股數']];
  sh[1].getRange('B2').setNumberFormat('@');
  sh[1].getRange(1,1,labels.length,3).setValues(labels);
  sh[1].getRange('B4').setNumberFormat('yyyy-mm-dd');
  sh[1].getRange('B10:B11').setNumberFormat('0.00%');
  sh[1].getRange('B16').setNumberFormat('0.00%');
  [['B7',['nominal','today_money']],['B12',['linear','growth_adjusted']],['B13',['buy_only','full','band']]].forEach(([r,v])=>sh[1].getRange(r).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(v,true).setAllowInvalid(false).build()));
  sh[3].getRange('A1:B4').setValues([['行情資訊','值'],['參考價格',''],['行情時間',''],['狀態','']]);
  sh[3].getRange('B2').setFormula('=IF(\'策略設定\'!B18<>"",\'策略設定\'!B18,IFERROR(GOOGLEFINANCE(\'策略設定\'!B3&":"&\'策略設定\'!B2,"price"),""))');
  sh[3].getRange('B3').setFormula('=IF(\'策略設定\'!B18<>"","手動覆寫",IFERROR(GOOGLEFINANCE(\'策略設定\'!B3&":"&\'策略設定\'!B2,"tradetime"),""))');
  sh[3].getRange('B4').setFormula('=IF(AND(ISNUMBER(B2),B2>0),"參考用；將價格貼為每期D欄數值快照","價格缺失")');
  sh[4].getRange('A1:B5').setValues([['計算','值'],['期末名目目標',''],['每期成長率',''],['設定狀態',''],['路徑提示','']]);
  sh[4].getRange('B2').setFormula('=IF(B4<>"OK","",ROUND(IF(\'策略設定\'!B7="nominal",\'策略設定\'!B6,\'策略設定\'!B6*(1+\'策略設定\'!B11)^(\'策略設定\'!B8/\'策略設定\'!B9)),2))');
  sh[4].getRange('B3').setFormula('=IF(B4<>"OK","",(1+\'策略設定\'!B10)^(1/\'策略設定\'!B9)-1)');
  const st="'策略設定'!";
  const numeric=[4,5,6,8,9,10,11,16,17,19].map(n=>`ISNUMBER(${st}B${n})`);
  const conditions=[...numeric,`${st}B4>0`,`${st}B5>=0`,`${st}B5<=1E9`,`${st}B6>0`,`${st}B6<=1E9`,... [8,9,17].flatMap(n=>[`${st}B${n}>0`,`${st}B${n}=INT(${st}B${n})`]),`${st}B19>=0`,`${st}B19<=1E9`,`${st}B19=INT(${st}B19)`,`${st}B10>-1`,`${st}B11>-1`,`${st}B16>=0`,`${st}B16<=1`,...[14,15,18,20].map(n=>`OR(${st}B${n}="",AND(ISNUMBER(${st}B${n}),${st}B${n}>=0,${st}B${n}<=1E9,${st}B${n}=ROUND(${st}B${n},6)))`),`OR(${st}B7="nominal",${st}B7="today_money")`,`OR(${st}B12="linear",${st}B12="growth_adjusted")`,`OR(${st}B13="buy_only",${st}B13="full",${st}B13="band")`];
  sh[4].getRange('B4').setFormula(`=IFERROR(IF(AND(${conditions.join(',')}),"OK","設定未完成或無效"),"設定未完成或無效")`);
  sh[4].getRange('B5').setFormula('=IF(B4<>"OK",B4,IF(\'策略設定\'!B5*(1+B3)^\'策略設定\'!B8>B2,"起始資產按假設成長已超過目標；確認路徑與不賣出政策","OK"))');
  const headers=['紀錄ID','投資期數','評價日期','參考價格快照','實際成交價格','期初持股','目標市值','交易前市值','目標差額','限制後建議額','建議股數','實際股數','費稅','現金股息','外部淨投入','期末持股','期末市值','累計淨投入','路徑偏差','備註','狀態'];
  sh[2].getRange(1,1,1,headers.length).setValues([headers]);
  prepareRows(sh[2],2,120);
  sh[0].getRange('A1:B9').setValues([['價值平均投資儀表板',''],['設定狀態',''],['期末名目目標',''],['最新有效市值',''],['累計淨投入',''],['最新建議股數',''],['需處理紀錄數',''],['使用方式','在每期紀錄下一個空白列輸入 B/C/D；成交後填 E/L/M/N。勿插列、刪列或排序；空白實際股數視為0。'],['帳務範圍','單一ETF；不含帳上現金；未實作XIRR或回測。']]);
  sh[0].getRange('B2').setFormula("='計算區'!B4");
  sh[0].getRange('B3').setFormula("='計算區'!B2");
  [['B4','Q'],['B5','R'],['B6','K']].forEach(([cell,col])=>sh[0].getRange(cell).setFormula(`=IFERROR(LOOKUP(2,1/('每期紀錄'!${col}2:${col}<>""),'每期紀錄'!${col}2:${col}),"")`));
  sh[0].getRange('B7').setFormula('=COUNTIF(\'每期紀錄\'!U2:U,"?*")-COUNTIF(\'每期紀錄\'!U2:U,"OK")');
  const chart=sh[0].newChart().setChartType(Charts.ChartType.LINE).addRange(sh[2].getRange('C1:C121')).addRange(sh[2].getRange('G1:G121')).addRange(sh[2].getRange('Q1:Q121')).setPosition(11,1,0,0).setOption('title','目標與實際市值').build();
  sh[0].insertChart(chart);
  sh.forEach(x=>{x.setFrozenRows(1);x.getRange(1,1,1,x.getLastColumn()).setBackground('#0F766E').setFontColor('#ffffff').setFontWeight('bold');x.setColumnWidths(1,x.getLastColumn(),150);});
  sh[0].setColumnWidth(2,600);sh[0].getRange('B8:B9').setWrap(true);
  sh[1].setColumnWidth(3,460);sh[1].getRange('B2:B20').setBackground('#eff6ff');
  sh[2].getRange('C2:C121').setNumberFormat('yyyy-mm-dd');
  sh[2].getRange('D2:E121').setNumberFormat('0.000000');
  [sh[0],sh[3],sh[4]].forEach(x=>x.protect().setWarningOnly(true));
  ss.setActiveSheet(sh[0]);ss.moveActiveSheet(1);
  SpreadsheetApp.flush();
}
function rowFormulas(r) {
  const s="'策略設定'!", c="'計算區'!";
  const prev=r===2?`${s}$B$19`:`IFERROR(LOOKUP(2,1/(P$2:P${r-1}<>""),P$2:P${r-1}),${s}$B$19)`;
  const base=`(${c}$B$2/(1+${c}$B$3)^${s}$B$8-${s}$B$5)/${s}$B$8`;
  const target=`ROUND(IF(${s}$B$12="linear",${s}$B$5+(${c}$B$2-${s}$B$5)*B${r}/${s}$B$8,(${s}$B$5+(${base})*B${r})*(1+${c}$B$3)^B${r}),2)`;
  const checks=[`IF(${c}$B$4<>"OK","設定無效",`,
    `IF(OR(NOT(ISNUMBER(C${r})),C${r}<${s}$B$4),"日期無效",`,
    `IF(OR(NOT(ISNUMBER(B${r})),B${r}<1,B${r}>${s}$B$8,B${r}<>INT(B${r})),"期數無效",`,
    `IF(COUNTIF(B$2:B,B${r})>1,"重複期數",`,
    ...(r>2?[`IF(COUNTIFS(C$2:C${r-1},"<>",U$2:U${r-1},"<>OK")>0,"前期錯誤",`,`IF(OR(B${r}<=IFERROR(MAX(B$2:B${r-1}),0),C${r}<IFERROR(MAX(C$2:C${r-1}),0)),"順序錯誤",`]:[]),
    `IF(OR(NOT(ISNUMBER(D${r})),D${r}<=0,D${r}<>ROUND(D${r},6)),"價格缺失或超過6位小數",`,
    `IF(OR(AND(L${r}<>"",NOT(ISNUMBER(L${r}))),N(L${r})<>INT(N(L${r})),F${r}+N(L${r})<0),"股數無效或超賣",`,
    `IF(AND(N(L${r})<>0,OR(NOT(ISNUMBER(E${r})),E${r}<=0,E${r}<>ROUND(E${r},6))),"成交價缺失",`,
    `IF(OR(AND(M${r}<>"",NOT(ISNUMBER(M${r}))),AND(N${r}<>"",NOT(ISNUMBER(N${r}))),N(M${r})<0,N(N${r})<0),"費稅或股息無效",`,
    `IF(OR(ABS(G${r})>1E9,F${r}*D${r}>1E9,(F${r}+N(L${r}))*D${r}>1E9,ABS(N(L${r})*N(E${r}))>1E9),"超過模板10億元範圍",`];
  const wrap=x=>`=IF(C${r}="","",IF(U${r}<>"OK","",${x}))`;
  const pol=`IF(${s}$B$13="buy_only",MAX(I${r},0),IF(AND(${s}$B$13="band",G${r}>0,ABS(I${r})<=G${r}*${s}$B$16),0,I${r}))`;
  const cap=`IF(a>0,IF(${s}$B$14="",a,MIN(a,${s}$B$14)),IF(${s}$B$15="",a,MAX(a,-${s}$B$15)))`;
  const units=`SIGN(J${r})*IF(D${r}*${s}$B$17>ABS(J${r}),0,QUOTIENT(ROUND(ABS(J${r})*1E6,0),ROUND(D${r}*1E6,0)*${s}$B$17)*${s}$B$17)`;
  return {
    1:`=IF(C${r}="","",${s}$B$21&"-"&B${r})`,
    6:`=IF(C${r}="","",${prev})`,
    7:`=IF(OR(C${r}="",${c}$B$4<>"OK"),"",IFERROR(${target},""))`,
    8:wrap(`ROUND(F${r}*D${r},6)`),9:wrap(`ROUND(G${r}-H${r},6)`),
    10:wrap(`LET(a,${pol},${cap})`),11:wrap(`MAX(-QUOTIENT(F${r},${s}$B$17)*${s}$B$17,${units})`),
    15:wrap(`ROUND(N(L${r})*N(E${r})+N(M${r})-N(N${r}),6)`),16:wrap(`F${r}+N(L${r})`),
    17:wrap(`ROUND(P${r}*D${r},6)`),18:wrap(`IF(${s}$B$20="","",${s}$B$20+SUM(O$2:O${r}))`),
    19:wrap(`ROUND(G${r}-Q${r},6)`),
    21:`=IF(C${r}="","",IFERROR(${checks.join('')}"OK"${')'.repeat(checks.length)},"輸入無效"))`
  };
}
function prepareRows(sheet,start,count) {
  const end=start+count-1;
  if(sheet.getMaxRows()<end) sheet.insertRowsAfter(sheet.getMaxRows(),end-sheet.getMaxRows());
  const cols=Object.keys(rowFormulas(start)).map(Number);
  cols.forEach(col=>{
    const values=Array.from({length:count},(_,i)=>[rowFormulas(start+i)[col]]);
    sheet.getRange(start,col,count,1).setFormulas(values);
    sheet.getRange(start,col,count,1).protect().setWarningOnly(true);
  });
  [2,3,4,5,12,13,14,20].forEach(col=>sheet.getRange(start,col,count,1).setBackground('#eff6ff'));
  sheet.getRange(start,3,count,1).setNumberFormat('yyyy-mm-dd');
  [4,5].forEach(col=>sheet.getRange(start,col,count,1).setNumberFormat('0.000000'));
}
function extendValueAveragingRows() {
  const lock=LockService.getDocumentLock();lock.waitLock(10000);
  try {
    const ss=SpreadsheetApp.getActive(), sheet=ss.getSheetByName('每期紀錄');
    if(!sheet) throw new Error('尚未建立模板');
    const last=sheet.getLastRow();
    const formulas=sheet.getRange(1,1,last,1).getFormulas();
    let prepared=1;
    formulas.forEach((row,i)=>{if(row[0]) prepared=i+1;});
    prepareRows(sheet,prepared+1,Math.max(120,last-prepared+120));
    const dashboard=ss.getSheetByName('投資儀表板');
    dashboard.getCharts().forEach(chart=>dashboard.updateChart(chart.modify().clearRanges().addRange(sheet.getRange(1,3,sheet.getLastRow(),1)).addRange(sheet.getRange(1,7,sheet.getLastRow(),1)).addRange(sheet.getRange(1,17,sheet.getLastRow(),1)).build()));
  } finally {lock.releaseLock();}
}
function onEdit(e) {
  if(!e || !e.range) return;
  const sheet=e.range.getSheet();
  if(sheet.getName()==='每期紀錄' && e.range.getLastRow()>=sheet.getLastRow()-10) extendValueAveragingRows();
}
