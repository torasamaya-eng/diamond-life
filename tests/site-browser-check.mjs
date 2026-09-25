// Isolated browser context: never touches the player's browser storage.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {auditCareer} from './audit-scenarios.mjs';
import {saveRetiredCareer,CAREER_LIBRARY_KEY} from '../dist/src/career-library.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/owner/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const states=[auditCareer(2175734977,'batter','university'),auditCareer(42,'pitcher','overseas')];
states[0].player.name='名鑑テスト 太郎';states[1].player.name='名鑑テスト 次郎';
const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
for(const state of states)assert.equal(saveRetiredCareer(state,{storage}).ok,true);
const report=[];fs.mkdirSync('reports/site-visual',{recursive:true});
try{
 for(const width of [1280,390,320]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  async function check(name){
   const overflow=await page.evaluate(()=>{const host=document.querySelector('.site-screen')||document.documentElement;return {scroll:host.scrollWidth,width:host.clientWidth};});
   assert.ok(overflow.scroll<=overflow.width+1,JSON.stringify({name,width,overflow}));
   await page.screenshot({path:`reports/site-visual/${width}-${name}.png`});report.push({width,name,overflow});
  }
  await page.goto('http://127.0.0.1:4173/');await page.locator('.site-home').waitFor();await check('top');
  await page.getByRole('button',{name:'選手名鑑',exact:true}).click();await check('empty');
  await page.getByRole('button',{name:'トップへ戻る'}).click();
  await page.getByRole('button',{name:'ニューゲーム'}).click();await page.locator('#new-player').waitFor();await check('creation');
  await page.getByRole('button',{name:'閉じる'}).click();
  for(const [name,label] of [['privacy','プライバシーポリシー'],['terms','利用規約'],['contact','お問い合わせ']]){
   await page.getByRole('link',{name:label,exact:true}).click();await page.waitForURL('**/'+name+'.html');await check(name);
   await page.getByRole('link',{name:'トップへ戻る'}).click();await page.locator('.site-home').waitFor();
  }
  await page.evaluate(([key,value])=>localStorage.setItem(key,value),[CAREER_LIBRARY_KEY,values.get(CAREER_LIBRARY_KEY)]);
  await page.getByRole('button',{name:'選手名鑑',exact:true}).click();await check('library');
  await page.getByRole('button',{name:'詳細を見る'}).first().click();assert.equal(await page.locator('dialog[open]').count(),0);await check('detail');
  await page.locator('summary').filter({hasText:'全年度の成績'}).click();await check('records');
  const scrollable=await page.evaluate(()=>{const table=[...document.querySelectorAll('details')].find(d=>d.querySelector(':scope > summary')?.textContent==='全年度の成績')?.querySelector('.table-wrap');if(!table)return false;table.scrollLeft=300;return table.scrollWidth<=table.clientWidth||table.scrollLeft>0;});assert.ok(scrollable);
  const table=page.locator('.table-wrap').filter({has:page.locator('tbody tr')}).first();assert.ok(await table.count());
  await page.evaluate(()=>document.querySelectorAll('.site-content details').forEach(d=>d.open=true));await check('all-details');
  await page.goBack();await page.getByRole('button',{name:'詳細を見る'}).first().waitFor();
  await page.goForward();await page.getByRole('button',{name:'選手名鑑に戻る'}).waitFor();
  await page.reload();await page.locator('.site-home').waitFor();await check('reload');
  await page.getByRole('button',{name:'選手名鑑',exact:true}).click();await page.getByRole('button',{name:'詳細を見る'}).last().click();await check('pitcher');
  await page.getByRole('button',{name:'選手名鑑に戻る'}).click();await page.getByRole('button',{name:'トップへ戻る'}).click();
  await page.getByRole('button',{name:'ニューゲーム'}).click();await page.getByRole('button',{name:'ランダム',exact:true}).click();await page.locator('.view-play').waitFor();await check('game');
  assert.deepEqual(errors,[]);await context.close();
 }
 fs.writeFileSync('reports/site-visual/results.json',JSON.stringify({report,errors:[]},null,2));console.log('PC/mobile, history, policies, records: passed');
}finally{await browser.close();}
