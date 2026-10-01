import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// Precommitted choices based on the public dossiers for seed 44. No latent
// values or future career results are consulted when choosing a player.
const portfolios=[
 {team:0,label:'即戦力捕手＋将来の救援',ids:['p10','p20','p1','p24','p54','p12','p74','p46'],reasons:{p10:'即戦力',p20:'守備',p1:'投球',p24:'将来性',p54:'打撃',p12:'将来性',p74:'守備',p46:'打撃'}},
 {team:4,label:'修正力の所見を重視',ids:['p1','p10','p54','p59','p24','p74','p12','p13'],reasons:{p1:'投球',p10:'守備',p54:'打撃',p59:'打撃',p24:'将来性',p74:'将来性',p12:'守備',p13:'打撃'}},
 {team:10,label:'打撃実績と打球の強さを重視',ids:['p13','p22','p39','p46','p29','p54','p59','p4'],reasons:{p13:'打撃',p22:'打撃',p39:'即戦力',p46:'将来性',p29:'打撃',p54:'打撃',p59:'打撃',p4:'打撃'}}
];
const server=http.createServer((req,res)=>{try{const file=path.join('dist',new URL(req.url,'http://local').pathname);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/draft/index.html`,browser=await chromium.launch({headless:true}),results=[];
fs.mkdirSync('reports/draft10-playthrough',{recursive:true});
try{for(const portfolio of portfolios){
 const page=await browser.newPage({viewport:{width:375,height:667},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 await page.evaluate(async team=>{const {createSession}=await import('/draft/draft.js'),{saveSession}=await import('/draft/storage.js');saveSession(createSession(44,undefined,team));},portfolio.team);await page.reload();
 for(const id of portfolio.ids){
  await page.locator(`[data-action="candidate"][data-id="${id}"]`).click();
  assert.ok((await page.locator('#detail').textContent()).includes('評価順位・指名確約ではありません'));
  await page.locator(`[data-reason-id="${id}"]`).selectOption(portfolio.reasons[id]);
  await page.locator('#detail .dialog-head [data-action="close"]').click();
  await page.locator(`[data-action="favorite"][data-id="${id}"]`).click();
 }
 await page.locator('[data-action="begin"]').click();let turns=0;
 while(await page.locator('[data-action="pick"]:enabled').count()){
  const ids=await page.locator('[data-action="pick"]:enabled').evaluateAll(buttons=>buttons.map(b=>b.dataset.id));
  const id=portfolio.ids.find(id=>ids.includes(id))||ids[0];
  await page.locator(`[data-action="pick"][data-id="${id}"]`).first().click();
  if(await page.locator('[data-action="draw-lottery"]').count()){
   await page.locator('[data-action="draw-lottery"]').click();await page.locator('.lottery-verdict').waitFor();await page.locator('#detail .dialog-head [data-action="close"]').click();
  }
  assert.ok(++turns<20);
 }
 await page.locator('[data-action="reveal"]').click();await page.locator('.results').waitFor();
 assert.equal(await page.locator('[data-action="result"]').count(),5);
 for(let i=0;i<5;i++){
  await page.locator('[data-action="result"]').nth(i).click();
  await page.locator('#detail').screenshot({path:`reports/draft10-playthrough/team-${portfolio.team}-player-${i}.png`});
  await page.locator('#detail .dialog-head [data-action="close"]').click();
 }
 const record=await page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem('hakkyu-draft.session')).state;
  return {team:s.clubs[s.playerTeam].team,needs:s.teamNeeds.map(n=>n.label),picks:s.results.map(r=>({name:r.name,id:r.id,round:r.pick.round,reason:r.pick.reason,classification:r.classification,verdict:r.verdict,years:r.years,narrative:r.narrative,events:r.events.filter(e=>['SLUMP','STAGNATION_RECOVERY','ADAPTATION','ADAPTATION_SUCCESS'].includes(e.type)).slice(0,6)}))};
 });
 results.push({strategy:portfolio.label,...record,errors});assert.deepEqual(errors,[]);await page.close();
}fs.writeFileSync('reports/draft10-playthrough/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();server.close();}
