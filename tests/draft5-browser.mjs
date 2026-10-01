import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://local').pathname;try{const file=path.join('dist',p);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/draft/index.html`,results=[];
fs.mkdirSync('reports/draft5-browser',{recursive:true});
try{for(const [name,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:375,height:667}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 await page.evaluate(async()=>{const {createSession}=await import('/draft/draft.js');const {saveSession}=await import('/draft/storage.js');saveSession(createSession(52));});await page.reload();
 const names=await page.evaluate(()=>JSON.parse(localStorage.getItem('hakkyu-draft.session')).state.candidates.map(c=>c.name));
 assert.equal(new Set(names.map(n=>n.split(' ')[1])).size,76);
 await page.screenshot({path:`reports/draft5-browser/${name}-names.png`});
 const titleCount=await page.evaluate(async()=>{
  const {createSession,finishDraft}=await import('/draft/draft.js');const {revealCareers,isRecordedAward}=await import('/draft/career.js');const {saveSession}=await import('/draft/storage.js');
  const s=finishDraft(createSession(52));revealCareers(s);const r=s.results[0],y=r.rows[0];
  for(const title of ['ゴールデングラブ相当','ベストナイン相当','MVP']){r.titles.push({year:y.year,age:y.age,title});y.awards.push(title);r.events.push({year:y.year,age:y.age,type:'AWARD',text:title});}
  saveSession(s);return r.titles.filter(t=>isRecordedAward(t.title)).length;
 });await page.reload();await page.locator('[data-action="result"]').first().waitFor();
 assert.ok(!(await page.locator('#app').textContent()).includes('相当'));
 await page.locator('[data-action="result"]').first().click();
 const detail=await page.locator('#detail').textContent();assert.ok(!detail.includes('相当'));assert.ok(detail.includes(`タイトル・表彰 ${titleCount}件`));assert.ok(detail.includes('MVP'));
 // Rendering a legacy save hides approximations without rewriting historical data.
 assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('hakkyu-draft.session')).state.results[0].titles.some(t=>t.title==='ベストナイン相当')));
 await page.locator('.dialog-body').evaluate(el=>el.scrollTop=el.scrollHeight);const close=await page.locator('#detail [data-action="close"]').boundingBox();assert.ok(close.y>=0&&close.y+close.height<=667);
 await page.screenshot({path:`reports/draft5-browser/${name}-legacy-awards.png`});await page.locator('#detail [data-action="close"]').click();assert.equal(await page.locator('#detail[open]').count(),0);
 assert.deepEqual(errors,[]);results.push({engine:name,viewport:'375x667',givenNames:76,legacyApproximateAwardsVisible:0,errors});console.log(`${name}: names and legacy awards passed`);
 }finally{await browser.close();}
}fs.writeFileSync('reports/draft5-browser/results.json',JSON.stringify(results,null,2));}finally{server.close();}
