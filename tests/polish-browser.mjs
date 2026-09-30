import {chromium,webkit} from 'playwright';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {narrativeFixtures,rosterPlayer} from './polish-fixtures.mjs';
import {careerReview} from '../dist/src/archive.js';
import {signOverseasRookie,overseasRookieTerms} from '../dist/src/contracts.js';
import {writeAutosave,AUTOSAVE_KEY,readAutosave} from '../dist/src/autosave.js';
import {CAREER_LIBRARY_KEY} from '../dist/src/career-library.js';
import {random} from '../dist/src/random.js';
import {TEAMS} from '../dist/src/data.js';
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://local').pathname,file=name==='/standalone.html'?'DIAMOND-LIFE.html':path.join('dist',name==='/'?'index.html':name);
 try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
const results=[];fs.mkdirSync('reports/polish-browser',{recursive:true});
const envelope=s=>{let value;assert.ok(writeAutosave(s,{setItem:(_,v)=>value=v}).ok);return value;};
function waiverPlayer(claim){for(let i=1;i<1000;i++){const s=rosterPlayer({seed:Math.imul(i,2654435761)>>>0});if((random(structuredClone(s))<.2)===claim)return s;}throw Error('No seed');}
const kinds=['young-clear','young-claim','three-years','prior-outright','five-option','five-waiver','split-salary','guaranteed-salary','market-salary','market-abroad','returned-salary','domestic-exact','retired-review','saved-review'];
try{for(const [name,type] of [['Chromium',chromium],['WebKit',webkit]]){
 const browser=await type.launch({headless:true});
 try{for(const width of [320,375,390,430,1280])for(const kind of kinds){
  const height=width===1280?900:667,ctx=await browser.newContext({viewport:{width,height}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));let s;
  if(kind==='young-clear'||kind==='young-claim')s=waiverPlayer(kind==='young-claim');
  else if(kind==='three-years')s=rosterPlayer({service:516});
  else if(kind==='prior-outright')s=rosterPlayer({priorOutright:true});
  else if(kind==='five-option')s=rosterPlayer({service:860,options:false});
  else if(kind==='five-waiver')s=rosterPlayer({service:860});
  else if(kind.endsWith('review')){s=narrativeFixtures().find(f=>f.id==='overseasComeback').state;const r=s.records.find(r=>r.stage==='mlb');r.salary=7842.3417;r.paidSalary=7842.3417;r.overseasPay={majorDays:62,minorDays:100};s.totalSalary=7842.3417;}
  else{
   s=rosterPlayer();s.rosterDecision=null;s.mlbRoster.on40=false;s.salary=7842.3417;s.activeContract.annual=s.salary;
   s.records=[{year:2039,age:27,stage:'mlb',team:s.team,salary:s.salary,paidSalary:7842.3417,basePaidSalary:7842.3417,stats:{...s.current,games:30,ab:60,hits:15},overseasPay:{majorDays:62,minorDays:100}}];s.totalSalary=7842.3417;
   if(kind==='split-salary'){signOverseasRookie(s,overseasRookieTerms(80,3));s.activeContract.payScale.minorAnnual=1906.5;s.salary=1906.5;}
   if(kind==='guaranteed-salary')s.contractOffers=[{id:'one',annual:7842.3417,years:2,year:s.year}];
   if(kind==='market-salary')s.market={year:s.year,kind:'mlbFa',closed:false,message:'海外契約の提示',offers:[{id:'mlb:0',team:s.team,stage:'mlb',salary:7842.3417,years:2,role:'主力候補'}]};
   if(kind==='market-abroad'){s.market={year:s.year,kind:'overseasFa',closed:false,message:'海外契約の提示',offers:[{id:'mlb:0',team:s.team,stage:'mlb',salary:7842.3417,years:2,role:'主力候補',incentive:{label:'出場条件',amount:33.3456}}]};s.stage='pro';s.team=TEAMS[0];s.salary=1000;s.activeContract.annual=1000;}
   if(kind==='returned-salary'){s.stage='pro';s.team=TEAMS[0];s.salary=1000;s.activeContract.annual=1000;}
   if(kind==='domestic-exact'){s.stage='pro';s.team=TEAMS[0];s.salary=1000;s.activeContract.annual=1000;s.records[0].stage='pro';s.records[0].team=s.team;s.records[0].salary=1000;s.records[0].paidSalary=1006.6667;s.records[0].firstTeamAllowance=6.6667;delete s.records[0].overseasPay;}
  }
  const originalSalary=s.salary,originalRecords=JSON.stringify(s.records),review=careerReview(s);
  await page.goto(url+(width===1280&&kind==='retired-review'?'/standalone.html':''));
  if(kind==='saved-review'){
   s.careerReview='古い数字の要約';await page.evaluate(([key,state])=>localStorage.setItem(key,JSON.stringify({version:1,careers:[{careerId:state.careerId,state}]})),[CAREER_LIBRARY_KEY,s]);
   await page.locator('[data-action="library-open"]').click();await page.locator('[data-action="library-view"]').click();
  }else{
   await page.evaluate(([key,value])=>localStorage.setItem(key,value),[AUTOSAVE_KEY,envelope(s)]);await page.reload();await page.locator('[data-action="resume"]').click();
  }
  if(['young-clear','young-claim','three-years','prior-outright','five-option','five-waiver'].includes(kind)){
   const modal=page.locator('dialog[open]'),text=await modal.innerText(),young=kind.startsWith('young');
   assert.equal(await page.locator('[data-action="roster-choice"][data-id="decline"]').count(),young?0:1);
   if(young){assert.ok(text.includes('ウェーバー結果を確認する'));assert.ok(!text.includes('配属に同意する'));}
   if(kind==='five-option')assert.ok(!text.includes('DFA'));
   const button=page.locator('[data-action="roster-choice"][data-id="accept"]'),bounds=await button.boundingBox(),box=await modal.boundingBox();
   assert.ok(box.x>=-1&&box.x+box.width<=width+1&&box.y>=-1&&box.y+box.height<=height+1,JSON.stringify(box));
   assert.ok(bounds.height>=44,'touch target');
   if(width===375)await page.screenshot({path:`reports/polish-browser/${name}-${kind}-decision.png`,animations:'disabled'});
   await button.click();
   const result=await page.locator('dialog[open]').innerText();assert.ok(result.includes('ロースター手続きの結果'));
   if(kind==='young-claim')assert.ok(result.includes('ウェーバーで獲得。40人枠へ。'));
   if(kind==='young-clear')assert.ok(result.includes('40人枠外でマイナー配属'));
   if(kind==='five-option')assert.ok(result.includes('オプション配属')&&!result.includes('DFA'));
   if(width===375)await page.screenshot({path:`reports/polish-browser/${name}-${kind}-result.png`,animations:'disabled'});
   await page.locator('[data-action="roster-result-dismiss"]').click();assert.equal(await page.locator('dialog[open]').count(),0);
  }else if(kind==='guaranteed-salary'||kind==='market-salary'||kind==='market-abroad'){
   const text=await page.locator('dialog[open]').innerText();assert.ok(text.includes('約7,842万円'));assert.ok(!text.includes('3,417円'));
   if(kind==='market-abroad'){assert.ok(text.includes('約33万円'));assert.ok(!text.includes('3,456円'));}
   await page.locator('[data-action="close"]').click();
  }else if(kind.endsWith('review')){
   if(kind==='retired-review')await page.locator('[data-action="final-career"]').click();
   const paragraph=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'一言寸評',exact:true})}).locator('p');
   assert.equal(await paragraph.innerText(),review);assert.ok((await paragraph.boundingBox()).width<=width);
   if(kind==='saved-review')assert.ok(!(await page.locator('#app').innerText()).includes('古い数字の要約'));
   assert.ok((await page.locator('#app').innerText()).includes('約7,842万円'));assert.ok(!(await page.locator('#app').innerText()).includes('3,417円'));
  }
  if(!kind.endsWith('review')&&!kind.startsWith('young')&&!kind.startsWith('five')&&!['three-years','prior-outright'].includes(kind)){
   await page.locator('[data-action="nav"][data-tab="career"]').click();await page.locator('summary').filter({hasText:'所属・契約・年俸'}).click();
   const text=await page.locator('#app').innerText();
   if(kind==='domestic-exact'){
    await page.locator('[data-action="nav"][data-tab="stats"]').click();assert.ok((await page.locator('#app').innerText()).includes('6万6,667円'));
   }else{
    assert.ok(text.includes('約7,842万円'));assert.ok(!text.includes('3,417円'));
    if(kind==='split-salary'){assert.ok(text.includes('127,100'));assert.ok(text.includes('780,000'));assert.ok(text.includes('約1,907万円'));}
   }
   const raw=await page.evaluate(key=>localStorage.getItem(key),AUTOSAVE_KEY),loaded=readAutosave({getItem:()=>raw});assert.equal(loaded.error,'');assert.equal(loaded.state.salary,originalSalary);assert.equal(JSON.stringify(loaded.state.records),originalRecords);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page horizontal overflow');assert.deepEqual(errors,[]);
  if(width===375)await page.screenshot({path:`reports/polish-browser/${name}-${kind}.png`,animations:'disabled'});
  results.push({browser:name,width,kind,passed:true,pageErrors:errors.length});await ctx.close();
 }}finally{await browser.close();}
}fs.writeFileSync('reports/polish-browser/results.json',JSON.stringify(results,null,2));console.log(results.length+' polish browser scenarios passed, 0 page errors');}finally{server.close();}
