import {createRequire} from 'node:module';import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';import {emptyStats} from '../dist/src/stats.js';import {setContract,signOverseasRookie,overseasRookieTerms} from '../dist/src/contracts.js';import {writeAutosave,AUTOSAVE_KEY} from '../dist/src/autosave.js';import {TEAMS} from '../dist/src/data.js';
const require=createRequire(import.meta.url),{chromium,webkit}=require('C:/Users/owner/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server=http.createServer((req,res)=>{const file=path.resolve('dist','.'+new URL(req.url,'http://localhost').pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file===path.resolve('dist')?path.join(file,'index.html'):file));}catch{res.writeHead(404).end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
const report=[];fs.mkdirSync('reports/contracts-browser',{recursive:true});
try{for(const [browserName,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true});
 try{for(const width of [375,1280])for(const kind of ['single','multi','development','rehab','fa','overseas']){
  const s=createPlayer('契約画面 太郎','batter',72);Object.assign(s,{stage:'pro',age:29,year:2035,team:TEAMS[0],salary:1800,proYears:10});
  s.records=Array.from({length:9},(_,i)=>({year:2026+i,age:20+i,stage:'pro',team:s.team,salary:1800,contractStatus:'registered',faDays:145,stats:{...emptyStats(),games:120,ab:450,hits:130,hr:20}}));setContract(s,1800);
  s.contractOffers=[{id:'one',annual:2400,years:1,year:s.year,reason:'直近3年間の一軍成績を評価'}];
  if(kind==='multi')s.contractOffers.push({id:'multi',annual:2200,years:3,year:s.year,incentive:{stat:'ab',target:440,amount:300,label:'440打数'},reason:'継続的な主力実績を評価'});
  if(kind==='development'){s.contractStatus='development';s.contractOffers[0].annual=300;}
  if(kind==='rehab'){s.health={name:'肘靱帯再建手術',daysLeft:400};s.contractOffers=[{id:'rehab',annual:900,years:1,year:s.year,development:true,reason:'将来性を評価。長期リハビリからの復帰を目指します。'}];}
  if(kind==='fa'){s.contractOffers=[];s.faDeclarations=[{year:s.year,kind:'fa',team:s.team,serviceDays:1305,outcome:'交渉中'}];s.market={year:s.year,kind:'fa',closed:false,message:'複数球団が長期契約を提示',offers:[{id:'fa:0',team:TEAMS[1],stage:'pro',salary:5000,years:3,role:'主力候補'},{id:'fa:1',team:TEAMS[2],stage:'pro',salary:6000,years:4,role:'主力候補'}]};}
  if(kind==='overseas'){s.stage='mlb';signOverseasRookie(s,overseasRookieTerms(80,3));s.contractOffers=[{id:'one',annual:450,years:1,year:s.year,payScale:s.activeContract.payScale}];}
  const values=new Map();writeAutosave(s,{setItem:(k,v)=>values.set(k,v)});
  const context=await browser.newContext({viewport:{width,height:667}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(([key,value])=>localStorage.setItem(key,value),[AUTOSAVE_KEY,values.get(AUTOSAVE_KEY)]);await page.goto(url);await page.getByRole('button',{name:'続きから',exact:true}).click();
  await page.locator('dialog.contract-dialog[open]').waitFor();
  if(width===375){
   if(kind==='multi'||kind==='fa')await page.locator('.contract-select').last().click();
   const button=page.locator('.contract-dock button'),rect=await button.boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=667,JSON.stringify(rect));assert.ok(rect.height>=44);
   assert.equal(await page.locator('.contract-body').evaluate(el=>el.scrollTop),0);
   await page.screenshot({path:'reports/contracts-browser/'+browserName+'-'+kind+'.png'});await button.click();
  }else await page.locator('.contract-desktop').last().click();
  const saved=await page.evaluate(key=>JSON.parse(JSON.parse(localStorage.getItem(key)).payload),AUTOSAVE_KEY);
  assert.equal(saved.salary,kind==='overseas'?450:kind==='multi'?2200:kind==='fa'?6000:kind==='rehab'?900:kind==='development'?300:2400);
  if(kind==='fa')assert.equal(saved.team,TEAMS[2]);if(kind==='rehab')assert.equal(saved.contractStatus,'development');assert.deepEqual(errors,[]);
  report.push({browser:browserName,width,kind,passed:true});await context.close();
 }}finally{await browser.close();}
}fs.writeFileSync('reports/contracts-browser/results.json',JSON.stringify(report,null,2));console.log(report.length+' browser scenarios passed');}finally{server.close();}
