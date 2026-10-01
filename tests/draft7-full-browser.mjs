import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {createSession,startDraft,chooseFirst,recommended} from '../dist/draft/draft.js';
let reballotFixture;
for(let seed=1;seed<=100;seed++){
 const state=createSession(seed,undefined,9);startDraft(state);const id=recommended(state)[0].id;state.declarations.fill(id);
 const trial=structuredClone(state);chooseFirst(trial,id);
 if(trial.phase==='first'){reballotFixture={state,id};break;}
}
assert.ok(reballotFixture,'a deterministic losing first-ballot fixture exists');
const server=http.createServer((req,res)=>{let p=new URL(req.url,'http://local').pathname;const file=path.join('dist',p==='/'?'index.html':p);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`,checks=[];fs.mkdirSync('reports/draft7-full-browser',{recursive:true});
try{for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});try{for(const width of [360,390,430,1280]){
 const context=await browser.newContext({viewport:{width,height:800}}),page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 async function finishLottery(){if(await page.locator('[data-action="draw-lottery"]').count()){await page.locator('[data-action="draw-lottery"]').click();await page.locator('.lottery-verdict').waitFor();await page.locator('#detail .dialog-head [data-action="close"]').click();}}
 async function check(name){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${engine} ${width} ${name}: horizontal overflow`);await page.screenshot({path:`reports/draft7-full-browser/${engine}-${width}-${name}.png`});checks.push({engine,width,name});}
 await page.goto(url);await page.locator('.site-home').waitFor();assert.ok(!requests.some(x=>x.includes('/draft/')),'life must not load draft modules');
 await page.locator('[data-action="new"]').click();await page.locator('[data-action="random-player"]').click();await page.locator('.view-play').waitFor();
 await page.locator('[data-action="year"]').click();if(await page.locator('#modal[open]').count())await page.locator('#modal').evaluate(d=>d.close());
 const life=await page.evaluate(()=>localStorage.getItem('diamond-life.autosave'));assert.ok(life);
 // Seed a real, valid archived career using the existing public storage implementation.
 await page.evaluate(async()=>{const {createPlayer,retire}=await import('/src/engine.js');const {saveRetiredCareer}=await import('/src/career-library.js');const c=createPlayer('保存保護 確認','batter',831);retire(c);const result=await saveRetiredCareer(c);if(!result.ok)throw Error(result.error);});
 const libraryBefore=await page.evaluate(async()=>{const {readCareerLibrary}=await import('/src/career-library.js');return JSON.stringify(await readCareerLibrary());});
 await page.locator('[data-action="library-open"]').first().click();await page.locator('[data-action="site-top"]').click();await page.getByRole('link',{name:/白球ドラフト/}).click();await page.locator('[data-action="start"]').waitFor();await check('intro');
 await page.locator('[data-action="start"]').click();await check('team-select');if(width===390){await page.locator('[data-action="random-team"]').click();}else{await page.locator('[data-action="select-team"][data-id="9"]').click();}await check('team-needs');await page.reload();await page.locator('[data-action="candidates"]').click();await check('scouting');
 const entry=page.locator('[data-action="begin"]');assert.equal(await entry.textContent(),'ドラフト会議へ進む');const entryBox=await entry.boundingBox();assert.ok(entryBox.height>=60);const entryContainer=await page.locator('.draft-entry').boundingBox();assert.ok(Math.abs(entryBox.width-entryContainer.width)<=1);await check('draft-entry');
 const firstProfile=page.locator('.card .profile-body').first();assert.match(await firstProfile.textContent(),/\d+cm・\d+kg/);

 await page.locator('.card [data-action="compare-toggle"]').nth(0).click();await page.locator('.card [data-action="compare-toggle"]').nth(1).click();await page.locator('[data-action="compare-open"]').click();assert.equal(await page.locator('.comparison-player').count(),2);await check('comparison');await page.locator('#detail [data-reason-id]').first().selectOption('将来性');await page.locator('#detail [data-action="close"]').click();
 await page.reload();await page.locator('[data-action="compare-open"]').click();assert.equal(await page.locator('.comparison-player').count(),2);assert.equal(await page.locator('#detail [data-reason-id]').first().inputValue(),'将来性');await page.locator('#detail [data-action="close"]').click();

 await page.locator('.card [data-action="candidate"]').first().click();await check('overview');
 await page.locator('[data-action="declare"]').click();await check('first-declaration');await page.locator('[data-action="bucket"][data-bucket="1位"]').click();await page.locator('[data-action="fallback"]').click();
 for(const tab of ['成績・成長','詳細データ']){await page.locator(`[data-tab="${tab}"]`).click();await check(tab==='成績・成長'?'history':'details');
 await page.locator('.dialog-body').evaluate(el=>el.scrollTop=el.scrollHeight);const closeAtBottom=await page.locator('#detail .dialog-head [data-action="close"]').boundingBox();assert.ok(closeAtBottom.y>=0&&closeAtBottom.y+closeAtBottom.height<=800);await check(tab==='成績・成長'?'history-bottom':'details-bottom');
}
 await page.locator('#detail [data-action="close"]').click();await page.locator('[data-filter="scope"]').selectOption('全候補');const batterId=await page.evaluate(()=>JSON.parse(localStorage.getItem('hakkyu-draft.session')).state.candidates.find(c=>c.role==='野手').id);await page.locator('.card [data-action="candidate"][data-id="'+batterId+'"]').first().click();await check('tools-personality');await page.locator('[data-tab="成績・成長"]').click();await page.locator('#detail .defense-stats').last().evaluate(x=>x.open=true);await check('defense-stats');await page.locator('#detail [data-action="close"]').click();await page.locator('[data-action="intelligence"]').click();await check('intelligence');await page.locator('#detail [data-action="close"]').click();
 // Six inspected prospects ensure at least one is not among the player's five
 // picks, even when the new club strategy happens to leave both comparisons free.
 const investigated=await page.locator('.card [data-action="favorite"]').evaluateAll(buttons=>buttons.slice(0,6).map(b=>b.dataset.id));
 for(const id of investigated){const b=page.locator('.card [data-action="favorite"][data-id="'+id+'"]');if(await b.getAttribute('aria-pressed')==='false')await b.click();}
 await page.locator('[data-action="begin"]').click();await check('draft');
 let iterations=0;while(await page.locator('[data-action="pick"]').count()){await page.locator('[data-action="pick"]:enabled').first().click();await finishLottery();assert.ok(++iterations<20);}
 await check('drafted');await page.reload();await page.locator('[data-action="reveal"]').waitFor();await page.locator('[data-action="reveal"]').dblclick();await page.locator('[data-action="result"]').first().waitFor();assert.equal(await page.locator('[data-action="result"]').count(),5);await check('results');assert.ok(await page.locator('.need-review').count());
 const watched=await page.locator('[data-action="watch-result"]').count();assert.ok(watched>0,'inspected and lost targets appear in retrospective');await page.locator('[data-action="watch-result"]').first().click();await check('watched-career');const watchedText=await page.locator('#detail').textContent();await page.locator('#detail [data-action="close"]').click();await page.reload();await page.locator('[data-action="watch-result"]').first().click();assert.equal(await page.locator('#detail').textContent(),watchedText);await page.locator('#detail [data-action="close"]').click();
await page.reload();await page.locator('[data-action="result"]').first().waitFor();
 for(let i=0;i<5;i++){await page.locator('[data-action="result"]').nth(i).click();await page.locator('#detail details').first().evaluate(x=>x.open=true);await check(`career-${i}`);
 await page.locator('.dialog-body').evaluate(el=>{el.querySelectorAll('details').forEach(d=>d.open=true);el.scrollTop=el.scrollHeight;});const closeBox=await page.locator('#detail .dialog-head [data-action="close"]').boundingBox();assert.ok(closeBox.y>=0&&closeBox.y+closeBox.height<=800);assert.ok(await page.locator('.dialog-body').evaluate(el=>el.scrollTop>0));await check(`career-bottom-${i}`);
await page.locator('#detail [data-action="close"]').click();}
 await page.locator('[data-action="again"]').click();await page.locator('[data-action="confirm-reset"]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('diamond-life.autosave')),life);
 await page.getByRole('link',{name:'白球人生へ'}).click();await page.locator('[data-action="resume"]').click();await page.locator('.view-play').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('diamond-life.autosave')),life);
 await page.locator('[data-action="library-open"]').first().click();await page.locator('[data-action="site-top"]').click();await page.getByRole('link',{name:/白球ドラフト/}).click();await page.locator('#delete').click();await page.locator('[data-action="confirm-delete"]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('hakkyu-draft.session')),null);assert.equal(await page.evaluate(()=>localStorage.getItem('diamond-life.autosave')),life);
 const libraryAfter=await page.evaluate(async()=>{const {readCareerLibrary}=await import('/src/career-library.js');return JSON.stringify(await readCareerLibrary());});assert.equal(libraryAfter,libraryBefore);
 // Explicitly exercise a contested first pick and a lost ballot, rather than rely on a random UI seed.
 await page.evaluate(async fixture=>{const {saveSession}=await import('/draft/storage.js');saveSession(fixture.state);},reballotFixture);await page.reload();await page.locator('[data-filter="scope"]').selectOption('全候補');
 await page.locator(`[data-action="pick"][data-id="${reballotFixture.id}"]`).first().click();await finishLottery();await page.getByText('抽選に外れました。残っている選手から再入札してください。',{exact:true}).waitFor();await page.locator('#app details').first().evaluate(x=>x.open=true);await check('lottery-reballot');
 let turns=0;const seenRounds=new Set();while(await page.locator('[data-action="pick"]').count()){
  const round=await page.locator('#app h1').first().textContent();if(!seenRounds.has(round)){seenRounds.add(round);await check(`round-${seenRounds.size}`);}
  await page.locator('[data-action="pick"]:enabled').first().click();await finishLottery();assert.ok(++turns<20);
 }assert.ok(seenRounds.has('育成指名'));assert.ok(seenRounds.has('2位指名'));assert.equal(await page.evaluate(()=>localStorage.getItem('diamond-life.autosave')),life);
 assert.deepEqual(errors,[]);await context.close();
 console.log(`${engine} ${width}: complete, storage isolated`);
 }}finally{await browser.close();}
}fs.writeFileSync('reports/draft7-full-browser/results.json',JSON.stringify({checks,count:checks.length,errors:[],coexistence:8},null,2));}finally{server.close();}
