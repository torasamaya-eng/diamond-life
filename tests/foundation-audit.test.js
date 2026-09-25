import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {auditCareer,auditProjection} from './audit-scenarios.mjs';
import {createPlayer,advance,retire} from '../dist/src/engine.js';
import {validate} from '../dist/src/storage.js';
import {ensureDevelopmentState,developmentContext,seasonEnvironment} from '../dist/src/development.js';
import {inspectDevelopmentState,developmentCheck} from '../dist/src/dev-tools.js';
import {DEV_MODE} from '../dist/src/balance.js';
import {random} from '../dist/src/random.js';
import {money,formatYen,yenFromMan,manFromYen} from '../dist/src/format.js';
import {writeAutosave,readAutosave,AUTOSAVE_KEY} from '../dist/src/autosave.js';
import {saveRetiredCareer,readCareerLibrary,CAREER_LIBRARY_KEY} from '../dist/src/career-library.js';
import {careerCardData} from '../dist/src/share.js';
const baseline=JSON.parse(fs.readFileSync(new URL('./audit-baseline.json',import.meta.url),'utf8'));
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('旧baselineを改変せず、意図した成長変更との差と30人生の状態整合を確認',()=>{
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('./audit-baseline.json',import.meta.url))).digest('hex'),'494e8d8c062e56f245d1a44be86dda66f66ac8ca9ebca9deec0316c8bd9f426f');
 const before=JSON.parse(fs.readFileSync(new URL('../reports/development-before.json',import.meta.url),'utf8'));
 let changed=0;
 for(const c of baseline){
  const s=auditCareer(c.seed,c.role,c.route,(s,previous)=>{
   assert.deepEqual(inspectDevelopmentState(s,previous),[],JSON.stringify(c));
  });
  assert.equal(before.baseline.find(r=>r.seed===c.seed&&r.role===c.role&&r.requestedRoute===c.route).finalHash,c.sha256);
  if(createHash('sha256').update(JSON.stringify(auditProjection(s))).digest('hex')!==c.sha256)changed++;
 }
 assert.equal(changed,baseline.length);
});
test('旧データを補完してもID・乱数・既存能力は不変。追加特性と年度環境は独立保存',()=>{
 const storage=memory(),s=createPlayer('旧選手','pitcher',42),id=s.careerId,seed=s.seed,abilities=structuredClone(s.player.abilities);
 delete s.player.developmentTraits;delete s.developmentHistory;delete s.seasonEnvironments;
 writeAutosave(s,storage);const loaded=readAutosave(storage).state;
 assert.equal(loaded.careerId,id);assert.equal(loaded.seed,seed);assert.deepEqual(loaded.player.abilities,abilities);
 assert.ok(Number.isFinite(loaded.player.developmentTraits.injuryResistance));
 assert.equal(readAutosave(storage).state.player.developmentTraits.injuryResistance,loaded.player.developmentTraits.injuryResistance);
 loaded.player.developmentTraits.futureTrait={example:1};
 loaded.seasonEnvironments[loaded.year]={leagues:{test:{mode:'reserved'}}};
 ensureDevelopmentState(loaded);
 const context=developmentContext(loaded);
 assert.equal(context.age,loaded.age);assert.equal(context.careerYear,1);
 assert.deepEqual(seasonEnvironment(loaded),{leagues:{test:{mode:'reserved'}}});
 retire(loaded);writeAutosave(loaded,storage);assert.ok(saveRetiredCareer(loaded,{storage}).ok);
 const archived=readCareerLibrary(storage).careers[0].state;
 assert.equal(archived.careerId,id);assert.equal(readAutosave(storage).state.careerId,id);
 assert.deepEqual(archived.player.developmentTraits.futureTrait,{example:1});
 const before=JSON.stringify(archived);careerCardData(archived);assert.equal(JSON.stringify(archived),before);
 writeAutosave(createPlayer('次の選手','batter',7),storage);
 assert.equal(readCareerLibrary(storage).careers[0].careerId,id);
 assert.ok(storage.getItem(AUTOSAVE_KEY));assert.ok(storage.getItem(CAREER_LIBRARY_KEY));
});
test('部分的に欠けた成長上限を乱数消費せず補完しNaNの能力を防ぐ',()=>{
 const s=createPlayer('互換確認','batter',99),seed=s.seed,power=s.player.potential.power;
 delete s.player.potential.meet;
 validate(s);assert.equal(s.seed,seed);assert.equal(s.player.potential.power,power);
 assert.ok(Number.isFinite(s.player.potential.meet));advance(s);
 assert.ok(Object.values(s.player.abilities).every(Number.isFinite));
});
test('開発用の検証は無変更で異常を検出、本番OFF・引退進行停止・Seed再現',()=>{
 assert.equal(DEV_MODE,false);
 const s=createPlayer('検証','batter',42),original=structuredClone(s);
 const a={seed:0},b={seed:0};for(let i=0;i<100;i++)assert.equal(random(a),random(b));
 assert.deepEqual(inspectDevelopmentState(s),[]);assert.deepEqual(s,original);
 s.age=-1;s.player.abilities.meet=1000;s.salary=500;s.careerId='DL-CHANGED';
 const codes=inspectDevelopmentState(s,original).map(i=>i.code);
 for(const code of ['invalid-age','age-year-mismatch','invalid-ability','amateur-salary','career-id-changed'])assert.ok(codes.includes(code));
 assert.deepEqual(developmentCheck(s,original),[]);
 const retired=createPlayer('引退','pitcher',7);retire(retired);const before=structuredClone(retired);
 assert.equal(advance(retired),false);assert.deepEqual(retired,before);
 retired.year++;assert.ok(inspectDevelopmentState(retired,before).some(i=>i.code==='retired-progression'));
 const mixed=createPlayer('区分検証','batter',1);
 mixed.records.push({stage:'pro',stats:{games:2},levels:{first:{games:1}},dailyRoster:{stage:'mlb',days:[{status:'minor'}]}});
 for(const code of ['roster-stage-mismatch','first-team-totals-mismatch','cross-league-roster'])assert.ok(inspectDevelopmentState(mixed).some(i=>i.code===code));
});
test('金額は万円の互換性を保ち、整数円の境界と共通表示を提供',()=>{
 for(const [man,label] of [[420,'420万円'],[1200,'1,200万円'],[8500,'8,500万円'],[10000,'1億円'],[35000,'3億5,000万円'],[250000,'25億円']]){
  assert.equal(money(man),label);assert.equal(formatYen(man*10000),label);
  assert.equal(manFromYen(yenFromMan(man)),man);
 }
 assert.equal(formatYen(12345678),'1,234万5,678円');
 assert.equal(money(1234.5678),'1,234万5,678円');
});
