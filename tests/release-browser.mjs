import {chromium,webkit} from 'playwright';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';import {TEAMS,CONFIG} from '../dist/src/data.js';import {emptyStats} from '../dist/src/stats.js';import {setContract} from '../dist/src/contracts.js';import {writeAutosave,AUTOSAVE_KEY} from '../dist/src/autosave.js';import {longCareer} from './release-fixtures.mjs';
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname;const file=name==='/standalone.html'?'DIAMOND-LIFE.html':path.join('dist',name==='/'?'index.html':name);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;const results=[];fs.mkdirSync('reports/release-browser',{recursive:true});
const envelope=s=>{let value;writeAutosave(s,{setItem:(_,v)=>value=v});return value;};
try{for(const [name,type] of [['Chromium',chromium],['WebKit',webkit]]){
 const browser=await type.launch({headless:true});
 try{
  for(const width of [320,375,390,430,768,1280])for(const stage of ['elementary','pro']){
   const s=createPlayer('画面 検証','batter',81);if(stage==='pro'){Object.assign(s,{stage,age:27,year:CONFIG.startYear+21,team:TEAMS[0],salary:2500});setContract(s,2500);s.records=[{year:s.year-1,age:26,stage,team:s.team,salary:2500,stats:{...emptyStats(),games:100,ab:300,hits:90}}];s.awards=[{year:s.year-1,age:26,title:'ベストナイン',team:s.team,stats:s.records[0].stats}];}
   const ctx=await browser.newContext({viewport:{width,height:width>=768?900:667}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);await page.evaluate(([key,value])=>localStorage.setItem(key,value),[AUTOSAVE_KEY,envelope(s)]);await page.reload();await page.locator('[data-action="resume"]').click();
   assert.equal(await page.locator('dialog[open]').count(),0);
   const bounds=await page.locator('[data-action="year"]').boundingBox();assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=(width>=768?900:667),JSON.stringify({name,width,stage,bounds}));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(width===375)assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2),'375 progress height');
   await page.screenshot({animations:'disabled',path:`reports/release-browser/${name}-${width}-${stage}.png`});
   await page.locator('[data-action="nav"][data-tab="career"]').click();await page.locator('summary').filter({hasText:'獲得タイトル・表彰'}).click();if(stage==='pro')assert.ok((await page.locator('#app').innerText()).includes('ベストナイン'));
   assert.deepEqual(errors,[]);results.push({browser:name,width,stage,passed:true});await ctx.close();
  }
  // Actual localStorage quota and real IndexedDB, each in an isolated origin/context.
  const ctx=await browser.newContext({viewport:{width:375,height:667}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
  const s=longCareer('maximum'),players=[0,1,2].map(i=>({...s,careerId:'DL-BROWSER000'+i})),old=JSON.stringify({version:1,careers:players.map(state=>({careerId:state.careerId,state}))});
  const quota=await page.evaluate(value=>{try{localStorage.setItem('diamond-life.retired-careers',value);return 'unexpected success';}catch(e){return e.name;}},old);assert.equal(quota,'QuotaExceededError');
  const single=JSON.stringify({version:1,careers:[{careerId:players[0].careerId,state:players[0]}]});
  await page.evaluate(value=>localStorage.setItem('diamond-life.retired-careers',value),single);
  await page.locator('[data-action="library-open"]').first().click();await page.getByText('保存選手 1 / 3',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('diamond-life.retired-careers')),null);
  await page.locator('[data-action="library-view"]').click();await page.getByRole('heading',{name:'長期保存 検証の最終キャリア',exact:true}).waitFor();const body=await page.locator('#app').innerText();assert.ok(body.includes('一言寸評'));
  // Public storage API is identical in module and standalone builds; save 3 records, reload and inspect.
  const saved=await page.evaluate(async ps=>{const lib=await import('/src/career-library.js');const out=[];for(const p of ps)out.push(await lib.saveRetiredCareer(p));return {out,count:(await lib.readCareerLibrary()).careers.length};},players);assert.ok(saved.out.every(r=>r.ok));assert.equal(saved.count,3);
  await page.evaluate(([k,v])=>localStorage.setItem(k,v),[AUTOSAVE_KEY,envelope(s)]);await page.reload();await page.locator('[data-action="library-open"]').first().click();await page.getByText('保存選手 3 / 3',{exact:true}).waitFor();
  await page.locator('[data-action="library-delete"]').first().click();await page.locator('dialog[open]').waitFor();await page.locator('[data-action="library-back"]').click();assert.equal(await page.locator('dialog[open]').count(),0);
  assert.deepEqual(errors,[]);results.push({browser:name,storageQuota:quota,migration:true,saved:3,roundTrip:true,passed:true});await ctx.close();
  const singleCtx=await browser.newContext(),singlePage=await singleCtx.newPage(),singleErrors=[];singlePage.on('pageerror',e=>singleErrors.push(e.message));await singlePage.goto(url+'/standalone.html');await singlePage.locator('[data-action="new"]').first().click();await singlePage.locator('[data-action="random-player"]').click();await singlePage.locator('[data-action="year"]').waitFor();assert.deepEqual(singleErrors,[]);results.push({browser:name,standalone:true,passed:true});await singleCtx.close();
 }finally{await browser.close();}
}}finally{server.close();fs.writeFileSync('reports/release-browser/results.json',JSON.stringify(results,null,2));}
console.log(results.length+' release browser scenarios passed');
