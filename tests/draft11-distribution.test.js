import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {CONFIG,TEAMS} from '../dist/draft/config.js';
import {createSession,finishDraft} from '../dist/draft/draft.js';
import {generateCandidates,report} from '../dist/draft/candidates.js';
import {simulateCareer} from '../dist/draft/career.js';
import {createDevelopment,developmentSeason,isDevelopingProspect} from '../dist/draft/development.js';
import {evaluateCareer} from '../dist/draft/evaluation.js';
import {empty} from '../dist/draft/stats.js';
import {saveSession,loadSession} from '../dist/draft/storage.js';

const historical=JSON.parse(fs.readFileSync(new URL('./fixtures/draft-history-reference.json',import.meta.url)));
const old=JSON.parse(fs.readFileSync(new URL('./fixtures/draft11-v1-compat.json',import.meta.url)));

test('draft11: Wikipedia observations use the actual unchanged game classification',()=>{
 assert.equal(historical.players.length,998);assert.equal(historical.players.filter(p=>p.error).length,9);
 for(const p of historical.players.filter(p=>!p.error)){
  assert.ok(p.playerUrl&&p.draftUrl&&p.revision);
  const ranks=p.records.map(record=>evaluateCareer({role:record.role,pick:{round:1},rows:[],total:{...empty(),...record.total}}));
  const best=ranks.sort((a,b)=>b.rank-a.rank)[0];
  const classification=best?.rank>=4&&['スター','スーパースター','レジェンド'].includes(best.absolute)?best.absolute:'その他';
  assert.equal(classification,p.classification,p.name);
 }
});

test('draft11: historical lower picks include observed stars and a legend, without guessed careers',()=>{
 const find=name=>historical.players.find(p=>p.name===name);
 assert.equal(find('鈴木一朗').rank,4);assert.equal(find('鈴木一朗').classification,'レジェンド');
 assert.equal(find('新井貴浩').rank,6);assert.equal(find('新井貴浩').classification,'スーパースター');
 assert.equal(find('岩瀬仁紀').rank,2);assert.equal(find('岩瀬仁紀').classification,'レジェンド');
 assert.equal(find('鈴木一朗').records[0].total.hits,4367);
 assert.equal(find('新井貴浩').records[0].total.hits,2203);
 assert.ok(find('渡辺雅弘').error);assert.equal(find('渡辺雅弘').classification,undefined);
});

test('draft11: old adaptation-v1 careers retain their exact pre-change results',()=>{
 for(const fixture of old){
  const s=finishDraft(createSession(fixture.seed,{...CONFIG,careerModel:'adaptation-v1',measurementModel:'legacy',needsModel:'legacy'})),c=s.candidates.find(c=>c.id===fixture.id);
  const r=simulateCareer(c,fixture.pick,fixture.seed);
  assert.equal(createHash('sha256').update(JSON.stringify(r)).digest('hex'),fixture.hash);
 }
});

test('draft11: current saves preserve v2 and previous saves preserve v1 through reload',()=>{
 for(const careerModel of ['adaptation-v1','adaptation-v2']){
  const s=finishDraft(createSession(42,{...CONFIG,careerModel}));let raw;const storage={setItem:(k,v)=>raw=v,getItem:()=>raw};
  assert.equal(saveSession(s,storage),'');const loaded=loadSession(storage);assert.equal(loaded.error,'');assert.deepEqual(loaded.state,s);
  const p=s.picks[0],c=s.candidates.find(c=>c.id===p.id);
  assert.deepEqual(simulateCareer(c,p,s.seed),simulateCareer(loaded.state.candidates.find(c=>c.id===p.id),p,s.seed));
 }
});

test('draft11: ceiling variation does not change public dossiers, candidate order or CPU picks',()=>{
 for(const seed of [1,7,42,52,293]){
  const a=finishDraft(createSession(seed,{...CONFIG,careerModel:'adaptation-v1'})),b=finishDraft(createSession(seed));
  assert.deepEqual(a.candidates.map(report),b.candidates.map(report));assert.deepEqual(a.picks,b.picks);assert.deepEqual(a.clubs,b.clubs);
 }
});

const prospect=()=>{const c=generateCandidates(42).find(c=>c.role==='野手');return {c,row:{age:24,injuryDays:0,farm:{...empty(),ab:300,hits:90,doubles:20,hr:10,bb:30}},context:{years:4,qualityGain:2}};};
test('draft11: prospect retention depends on demonstrated growth, health and farm performance',()=>{
 const {c,row,context}=prospect();assert.ok(isDevelopingProspect(c,row,context));
 assert.equal(isDevelopingProspect(c,row,{...context,qualityGain:0}),false);
 assert.equal(isDevelopingProspect(c,{...row,injuryDays:150},context),false);
 assert.equal(isDevelopingProspect(c,{...row,farm:empty()},context),false);
 assert.equal(isDevelopingProspect(c,{...row,age:28},context),false);
 assert.equal(isDevelopingProspect(c,row,{...context,years:7}),false);
 c.hidden.developmentModel='adaptation-v1';assert.equal(isDevelopingProspect(c,row,context),false);
});

test('draft11: retention never grants a career based on hidden potential or draft reputation',()=>{
 const {c,row,context}=prospect(),before=isDevelopingProspect(c,row,context);
 c.rank=1;c.tier='1位候補';c.hidden.potential=97;assert.equal(isDevelopingProspect(c,row,context),before);
 c.rank=76;c.tier='育成候補';c.hidden.potential=45;assert.equal(isDevelopingProspect(c,row,context),before);
});

test('draft11: adaptation is conditional on existing traits and resolves through existing recovery',()=>{
 const original=generateCandidates(42).find(c=>c.role==='野手');
 const context={seed:7,age:23,years:1,team:TEAMS[0],overseas:false,availability:1,previous:null,add:()=>{}};
 const good=structuredClone(original),bad=structuredClone(original);
 good.hidden.adaptability=good.hidden.repair=good.hidden.pressure=1;bad.hidden.adaptability=bad.hidden.repair=bad.hidden.pressure=0;
 const dg=createDevelopment(good,{team:0,round:1}),db=createDevelopment(bad,{team:0,round:1});
 assert.ok(developmentSeason(good,dg,context).form>developmentSeason(bad,db,context).form);
 const load=dg.load;
 for(let age=24;age<=30;age++)developmentSeason(good,dg,{...context,age,years:age-22});
 assert.ok(dg.load<=load);
});

test('draft11: no reputation changes can alter a player future with the same pick and seed',()=>{
 const c=generateCandidates(42)[0],p={team:0,round:4,development:false},before=structuredClone(c),r=simulateCareer(c,p,42);
 c.rank=76;c.tier='育成候補';c.surveys=0;c.interviews=0;
 assert.deepEqual(simulateCareer(c,p,42),r);assert.deepEqual(simulateCareer(before,p,42),r);
});
