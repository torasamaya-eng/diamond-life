import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';

const server=http.createServer((req,res)=>{try{
 const file=path.join('dist',new URL(req.url,'http://local').pathname);
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
 res.end(fs.readFileSync(file));
}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/draft/index.html`,results=[];
fs.mkdirSync('reports/draft9-browser',{recursive:true});
const cards=page=>page.locator('.prospect').evaluateAll(nodes=>nodes.map(n=>({
 id:n.querySelector('[data-action="candidate"]').dataset.id,
 number:n.querySelector('.serial').textContent,
 tier:n.querySelectorAll('.prospect-name .tag')[1].textContent
})));
try{for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{for(const width of [375,1280]){
  const page=await browser.newPage({viewport:{width,height:667}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.evaluate(async()=>{
   const {createSession}=await import('/draft/draft.js');
   const {saveSession}=await import('/draft/storage.js');
   saveSession(createSession(42));localStorage.setItem('diamond-life.autosave','protected');
  });
  await page.reload();
  const saved=await page.evaluate(()=>localStorage.getItem('hakkyu-draft.session'));
  assert.equal(await page.locator('[data-filter="scope"]').inputValue(),'注目候補');
  const initial=await cards(page);
  assert.equal(initial.length,22);
  assert.deepEqual(initial.map(c=>c.number),Array.from({length:22},(_,i)=>`資料 ${String(i+1).padStart(2,'0')}`));
  assert.equal(initial.filter(c=>c.tier==='1位候補').length,12);
  assert.equal(initial.filter(c=>c.tier==='上位候補').length,10);
  const expected=await page.evaluate(async()=>{
   const {loadSession}=await import('/draft/storage.js');
   const {orderCandidates}=await import('/draft/candidate-order.js');
   const s=loadSession().state;return orderCandidates(s,s.candidates).map(c=>({id:c.id,rank:c.rank}));
  });
  assert.deepEqual(initial.map(c=>c.id),expected.slice(0,22).map(c=>c.id));
  assert.notDeepEqual(expected.slice(0,22).map(c=>c.rank),Array.from({length:22},(_,i)=>i+1));
  await page.locator('.prospect').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:`reports/draft9-browser/${engine}-${width}-featured.png`});
  await page.locator('[data-filter="role"]').selectOption('投手');
  assert.ok((await cards(page)).every(c=>initial.some(x=>x.id===c.id&&x.number===c.number)));
  await page.locator('[data-filter="role"]').selectOption('すべて');
  await page.locator('[data-filter="scope"]').selectOption('全候補');
  const all=await cards(page);assert.equal(all.length,76);
  assert.deepEqual(all.slice(0,22),initial);
  assert.equal(await page.evaluate(()=>localStorage.getItem('hakkyu-draft.session')),saved);
  await page.reload();assert.deepEqual(await cards(page),initial);
  await page.locator('[data-action="begin"]').click();
  assert.equal(await page.locator('[data-filter="scope"]').inputValue(),'全候補');
  assert.deepEqual(await cards(page),all);
  assert.equal(await page.evaluate(()=>localStorage.getItem('diamond-life.autosave')),'protected');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);
  results.push({engine,width,featured:22,all:76,stableNumbers:true,unchangedSave:true,errors});
  console.log(`${engine} ${width}: passed`);await page.close();
 }}finally{await browser.close();}
}fs.writeFileSync('reports/draft9-browser/results.json',JSON.stringify(results,null,2));
}finally{server.close();}
