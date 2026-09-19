// Construction/extension checks using a mock Apps Script host, NOT a Sheets calculation engine.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/GoogleSheetsTemplate.gs'),'utf8');
const toCol=s=>[...s].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
class Range {
  constructor(sheet,r,c,n=1,m=1){Object.assign(this,{sheet,r,c,n,m});}
  setValues(v){assert.equal(v.length,this.n);v.forEach((row,i)=>{assert.equal(row.length,this.m);row.forEach((x,j)=>this.sheet.cells.set(`${this.r+i},${this.c+j}`,x));});return this;}
  setFormulas(v){v.flat().forEach(f=>{assert.ok(f.startsWith('='));let n=0,quoted=false;for(const c of f){if(c==='"') quoted=!quoted;if(!quoted){if(c==='(')n++;if(c===')')n--;assert.ok(n>=0,f);}}assert.equal(n,0,f);});return this.setValues(v);}
  setFormula(f){return this.setFormulas([[f]]);}
  getFormulas(){return Array.from({length:this.n},(_,i)=>Array.from({length:this.m},(_,j)=>{const v=this.sheet.cells.get(`${this.r+i},${this.c+j}`);return typeof v==='string'&&v.startsWith('=')?v:'';}));}
  getSheet(){return this.sheet;} getLastRow(){return this.r+this.n-1;}
}
['setNumberFormat','setDataValidation','setBackground','setFontColor','setFontWeight','setWrap','setWarningOnly','protect'].forEach(n=>Range.prototype[n]=function(){return this;});
function chain(){return new Proxy({},{get:(t,k)=>k==='build'?()=>({modify:chain}):()=>chain()});}
class Sheet {
 constructor(name){this.name=name;this.cells=new Map();this.rows=1000;this.charts=[];}
 getName(){return this.name;} getMaxRows(){return this.rows;} insertRowsAfter(r,n){this.rows+=n;}
 getLastRow(){return Math.max(1,...[...this.cells.keys()].map(x=>+x.split(',')[0]));}
 getLastColumn(){return Math.max(1,...[...this.cells.keys()].map(x=>+x.split(',')[1]));}
 getRange(r,c,n,m){if(typeof r==='string'){const a=r.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);assert.ok(a,r);return new Range(this,+a[2],toCol(a[1]),a[4]?+a[4]-a[2]+1:1,a[3]?toCol(a[3])-toCol(a[1])+1:1);}return new Range(this,r,c,n,m);}
 newChart(){return chain();} insertChart(x){this.charts.push(x);} getCharts(){return this.charts;} updateChart(){} protect(){return chain();}
}
['setFrozenRows','setColumnWidths','setColumnWidth'].forEach(n=>Sheet.prototype[n]=function(){return this;});
const ss={sheets:[new Sheet('Sheet1')],getSheetByName(n){return this.sheets.find(x=>x.name===n);},insertSheet(n){const s=new Sheet(n);this.sheets.push(s);return s;},setActiveSheet(s){this.active=s;},moveActiveSheet(n){this.sheets=this.sheets.filter(x=>x!==this.active);this.sheets.splice(n-1,0,this.active);}};
const ctx=vm.createContext({SpreadsheetApp:{getActive:()=>ss,newDataValidation:chain,flush(){},getUi:chain},Utilities:{getUuid:()=> 'test-plan'},Charts:{ChartType:{LINE:'LINE'}},LockService:{getDocumentLock:()=>({waitLock(){},releaseLock(){}})}});
vm.runInContext(source,ctx);
ctx.createValueAveragingTemplate();
assert.equal(ss.sheets[0].name,'投資儀表板');
const ledger=ss.getSheetByName('每期紀錄');
for(let row=2;row<=121;row++){
  for(const col of [1,6,7,8,9,10,11,15,16,17,18,19,21]) assert.ok(ledger.cells.get(`${row},${col}`).startsWith('='));
  for(const col of [2,3,4,5,12,13,14,20]) assert.equal(ledger.cells.has(`${row},${col}`),false);
}
assert.throws(()=>ctx.createValueAveragingTemplate(),/同名/);
// Paste crossing capacity: preserve inputs and ensure every pasted row gains formulas.
ledger.getRange(122,3,2,1).setValues([[45000],[45030]]);
ctx.onEdit({range:ledger.getRange(122,3,2,1)});
for(const r of [122,123,243]) assert.ok(ledger.cells.get(`${r},11`).startsWith('='));
assert.equal(ledger.cells.get('122,3'),45000);
assert.ok(ctx.rowFormulas(2)[11].includes('QUOTIENT(F2'));
assert.ok(ctx.rowFormulas(3)[6].includes('P$2:P2'));
assert.ok(ctx.rowFormulas(2)[21].includes('價格缺失'));
assert.ok(ctx.rowFormulas(2)[10].includes('B$14'));
assert.ok(!ctx.rowFormulas(2)[7].includes('H2'));
console.log('PASS: native template construction, formula syntax balance, input preservation, initial positions, capacity-crossing paste, lot-bound inventory, dashboard order.');
