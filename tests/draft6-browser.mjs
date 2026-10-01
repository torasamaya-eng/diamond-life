import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const server=http.createServer((req,res)=>{try{const file=path.join('dist',new URL(req.url,'http://local').pathname);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/draft/index.html`,results=[];
fs.mkdirSync('reports/draft6-browser',{recursive:true});
try{for(const [name,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:375,height:667}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 const fixture=await page.evaluate(async()=>{
  const {createSession,startDraft,chooseFirst,finishDraft}=await import('/draft/draft.js');const {lostCandidates}=await import('/draft/watchlist.js');const {revealCareers}=await import('/draft/career.js');const {saveSession}=await import('/draft/storage.js');
  for(let seed=1;seed<=12;seed++){const s=createSession(seed),id=s.candidates[0].id;startDraft(s);s.declarations.fill(id);chooseFirst(s,id);if(!lostCandidates(s).some(c=>c.id===id))continue;finishDraft(s);revealCareers(s);saveSession(s);return {id,name:s.candidates.find(c=>c.id===id).name,team:s.picks.find(p=>p.id===id).team};}throw Error('No lost ballot');
 });await page.reload();await page.locator('.lost-candidates').waitFor();
 const btn=page.locator(`.lost-candidates [data-action="watch-result"][data-id="${fixture.id}"]`);assert.equal(await btn.count(),1);
 assert.match(await page.locator('.lost-candidates').textContent(),/12球団競合/);assert.ok(await page.locator('.lost-candidates').evaluate(el=>!!el.nextElementSibling?.classList.contains('results')));
 assert.equal(await page.locator(`[data-action="watch-result"][data-id="${fixture.id}"]`).count(),1);
 await page.locator('.lost-candidates').scrollIntoViewIfNeeded();await page.screenshot({path:`reports/draft6-browser/${name}-lost-section.png`});await btn.click();
 const detail=await page.locator('#detail').textContent();assert.ok(detail.includes(fixture.name));assert.ok(detail.includes('全年度成績'));assert.ok(detail.includes('タイトル・表彰'));
 const cached=await page.evaluate(id=>JSON.parse(localStorage.getItem('hakkyu-draft.session')).state.watchedResults[id],fixture.id);assert.equal(cached.pick.team,fixture.team);
 await page.locator('#detail [data-action="close"]').click();await page.reload();await btn.click();assert.equal(await page.locator('#detail').textContent(),detail);
 assert.deepEqual(errors,[]);results.push({engine:name,lostCareerVisible:true,reloadStable:true,errors});console.log(`${name}: lost career visible and reload stable`);
 }finally{await browser.close();}
}fs.writeFileSync('reports/draft6-browser/results.json',JSON.stringify(results,null,2));}finally{server.close();}
