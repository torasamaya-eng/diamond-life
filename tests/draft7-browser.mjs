import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';import {createSession,startDraft,chooseFirst} from '../dist/draft/draft.js';
let fixture,target;for(let seed=1;seed<=12;seed++){const state=createSession(seed),id=state.candidates[0].id;startDraft(state);state.declarations.fill(id);const trial=structuredClone(state);chooseFirst(trial,id);if(trial.lotteries[0][0].winner!==state.playerTeam){fixture=state;target=id;break;}}assert.ok(fixture);
const server=http.createServer((req,res)=>{try{const file=path.join('dist',new URL(req.url,'http://local').pathname);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/draft/index.html`,checks=[];fs.mkdirSync('reports/draft7-browser',{recursive:true});
try{for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});try{for(const width of [375,430,1280]){
 const page=await browser.newPage({viewport:{width,height:667}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 await page.evaluate(async state=>{const {saveSession}=await import('/draft/storage.js');saveSession(state);localStorage.setItem('diamond-life.autosave','protected');},fixture);await page.reload();await page.locator('[data-filter="scope"]').selectOption('全候補');
 const choose=page.locator(`[data-action="pick"][data-id="${target}"]`).first(),before=await page.evaluate(()=>localStorage.getItem('hakkyu-draft.session'));await choose.click();
 assert.match(await page.locator('#detail').textContent(),/12球団競合/);assert.match(await page.locator('#detail').textContent(),/1 \/ 12（8.3%）/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('hakkyu-draft.session')),before);await page.screenshot({path:`reports/draft7-browser/${engine}-${width}-lottery-preview.png`});
 await page.locator('#detail .dialog-head [data-action="close"]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('hakkyu-draft.session')),before);await choose.click();
 await page.locator('[data-action="draw-lottery"]').evaluate(b=>{b.click();b.click();});await page.locator('.lottery-verdict').waitFor();assert.equal(await page.locator('.lottery-verdict').textContent(),'抽選に外れました');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hakkyu-draft.session')).state.lotteries.length),1);await page.screenshot({path:`reports/draft7-browser/${engine}-${width}-lottery-result.png`});await page.locator('#detail .dialog-head [data-action="close"]').click();
 let turns=0;while(await page.locator('[data-action="pick"]:enabled').count()){
  await page.locator('[data-action="pick"]:enabled').first().click();if(await page.locator('[data-action="draw-lottery"]').count()){await page.locator('[data-action="draw-lottery"]').click();await page.locator('.lottery-verdict').waitFor();await page.locator('#detail .dialog-head [data-action="close"]').click();}assert.ok(++turns<25);
 }
 await page.locator('[data-action="reveal"]').click();await page.locator('[data-action="result"]').first().waitFor();
 const current=await page.evaluate(()=>JSON.parse(localStorage.getItem('hakkyu-draft.session')).state);assert.ok(current.results.every(r=>r.honorsModel==='league-v1'));
 await page.evaluate(async()=>{const {loadSession,saveSession}=await import('/draft/storage.js'),s=loadSession().state,r=s.results[0];r.highestSalary=12500;r.totalSalary=203456;r.rows[0].salary=12500;r.narrative='旧版の甘い寸評';saveSession(s);});await page.reload();
 assert.ok((await page.locator('.results').textContent()).includes('最高年俸 1億2,500万円'));assert.ok(!(await page.locator('.results').textContent()).includes('旧版の甘い寸評'));
 await page.locator('[data-action="result"]').first().click();assert.ok((await page.locator('#detail').textContent()).includes('生涯年俸20億3,456万円'));
 assert.ok(await page.locator('.development-table tbody tr').count()>=3);assert.ok((await page.locator('.development-review').textContent()).includes('指名時の資料'));await page.locator('.development-review').scrollIntoViewIfNeeded();await page.screenshot({path:`reports/draft7-browser/${engine}-${width}-comparison.png`});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('.dialog-body').evaluate(el=>el.scrollTop=el.scrollHeight);const close=await page.locator('#detail .dialog-head [data-action="close"]').boundingBox();assert.ok(close.y>=0&&close.y+close.height<=667);
 await page.locator('#detail .dialog-head [data-action="close"]').click();await page.locator('.lost-candidates [data-action="watch-result"]').first().click();assert.ok(await page.locator('.development-table').count());await page.locator('#detail .dialog-head [data-action="close"]').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('diamond-life.autosave')),'protected');assert.deepEqual(errors,[]);checks.push({engine,width,lottery:true,comparison:true,money:true,oldReview:true,errors});await page.close();console.log(`${engine} ${width}: complete`);
 }}finally{await browser.close();}
}fs.writeFileSync('reports/draft7-browser/results.json',JSON.stringify(checks,null,2));}finally{server.close();}
