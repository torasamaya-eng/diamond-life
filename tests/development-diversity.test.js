import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createPlayer,advance,environment,retire} from '../dist/src/engine.js';
import {grow,ageGrowthBase,growthVariance,declineMultiplier} from '../dist/src/growth.js';
import {ensureDevelopmentState,prepareDevelopmentGrowth,developmentGrowthModifier,developmentRoll,developmentInjuryModifier,developmentHealthFactor,applyNewInjuryGrowth,observeDevelopmentRoster} from '../dist/src/development.js';
import {seasonEvent,breakoutChance,breakoutAvailable} from '../dist/src/events.js';
import {injuryProbability} from '../dist/src/health.js';
import {decideNational} from '../dist/src/national.js';
import {emptyStats} from '../dist/src/stats.js';
import {DECLINE,BREAKOUT,ROUTE_GROWTH} from '../dist/src/balance.js';
import {readAutosave,writeAutosave} from '../dist/src/autosave.js';
import {readCareerLibrary,saveRetiredCareer,CAREER_LIBRARY_KEY} from '../dist/src/career-library.js';
import {validate} from '../dist/src/storage.js';
import {auditCareer,auditProjection} from './audit-scenarios.mjs';
import {studyRetirement,studyRow} from './development-study.mjs';
import {reviewEmployment} from '../dist/src/lifecycle.js';
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
function adult(seed=42,stage='overseas'){
 const s=createPlayer('試験 選手','batter',seed);s.stage=stage;s.age=21;s.year=2029;s.grade=1;
 s.team=stage;s.player.arc='ordinary';delete s.player.recordTalent;s.player.arcEvent=true;s.player.growthPhase='normal';s.player.peakAge=31;
 for(const k in s.player.abilities){s.player.abilities[k]=45;s.player.potential[k]=95;}
 s.developmentState.stagnationReviewYear=s.year;
 return s;
}
const magnitude=changes=>Object.values(changes).reduce((n,v)=>n+v,0);

test('国内プロ未経験の独立選手へ戦力外経由のプロ契約を保証せず、経験者の再雇用は維持',()=>{
 let checked=false;
 for(let seed=1;seed<=100&&!checked;seed++){
  const s=adult(seed,'independent');s.age=23;s.proYears=5;s.activeContract=null;s.contractOffers=[];
  const record={overall:35,stats:emptyStats(),stage:'independent'};
  const veteran=structuredClone(s);veteran.records=[{stage:'pro'}];
  reviewEmployment(s,record);reviewEmployment(veteran,record);
  if(s.employment?.type==='released'&&veteran.employment?.type==='released'){
   assert.ok(!s.employment.options.some(o=>o.stage==='pro'));
   assert.ok(s.employment.options.some(o=>o.role==='player'&&o.stage==='corporate'));
   assert.ok(veteran.employment.options.some(o=>o.role==='player'&&o.stage==='pro'&&o.development));
   checked=true;
  }
 }
 assert.ok(checked);
});

test('talentは基本成長へ一度だけ掛かり、成長上限に別の重複パラメータを使わない',()=>{
 const base=adult(42,'high'),gains=[];
 for(const talent of [.8,1,1.2]){
  const s=structuredClone(base);s.player.talent=talent;
  gains.push(grow(s,{growth:10,opportunity:1,competition:30,games:20,boost:[]}));
 }
 for(const key of Object.keys(gains[0]))assert.ok(Math.abs((gains[2][key]-gains[1][key])-(gains[1][key]-gains[0][key]))<1e-8,key);
 const s=adult();for(const key in s.player.abilities)s.player.potential[key]=s.player.abilities[key];
 grow(s,environment(s));
 assert.ok(Object.entries(s.player.abilities).every(([key,v])=>v<=s.player.potential[key]));
});

test('固定した成功失敗抽選なしで、天才の上限未達・名球会未到達と非天才スターを再現',()=>{
 const cases=[[500282233,'batter','overseas'],[3041712678,'pitcher','pro']];
 const rows=cases.map(([seed,role,route])=>studyRow(auditCareer(seed,role,route,null,{shouldRetire:studyRetirement}),seed,role,route));
 assert.ok(rows[0].genius&&rows[0].maxPro<90&&!rows[0].legacy);
 assert.ok(!rows[1].genius&&rows[1].star);
});
test('同Seedのtrait・peakAgeが一致し、天才抽選・既存talent/potentialと重複しない',()=>{
 for(let i=1;i<=100;i++){
  const a=createPlayer('A','batter',i*7919),b=createPlayer('B','batter',i*7919);
  const {name:an,...ap}=a.player,{name:bn,...bp}=b.player;assert.deepEqual(ap,bp);
  assert.equal(a.seed,b.seed);
  const before={talent:a.player.talent,potential:structuredClone(a.player.potential),phase:a.player.growthPhase,arc:a.player.arc,peak:a.player.peakAge,seed:a.seed};
  ensureDevelopmentState(a);ensureDevelopmentState(a);
  assert.deepEqual({talent:a.player.talent,potential:a.player.potential,phase:a.player.growthPhase,arc:a.player.arc,peak:a.player.peakAge,seed:a.seed},before);
  for(const key of ['innateTalent','growthPotential','developmentTiming','peakAge','clutch'])assert.equal(a.player.developmentTraits[key],undefined);
 }
});
test('旧保存のtrait補完は決定的で、一度保存されID・能力・乱数・過去履歴を維持',()=>{
 const s=adult(),store=memory();delete s.developmentState;s.player.developmentTraits={injuryResistance:null};
 const seed=s.seed,peak=s.player.peakAge,abilities=structuredClone(s.player.abilities),history=structuredClone(s.developmentHistory),id=s.careerId;
 const copy=structuredClone(s);ensureDevelopmentState(copy);
 writeAutosave(s,store);const a=readAutosave(store).state,b=readAutosave(store).state;
 assert.deepEqual(a.player.developmentTraits,b.player.developmentTraits);assert.deepEqual(a.player.developmentTraits,copy.player.developmentTraits);
 assert.equal(a.seed,seed);assert.equal(a.careerId,id);assert.equal(a.player.peakAge,peak);assert.deepEqual(a.player.abilities,abilities);assert.deepEqual(a.developmentHistory,history);
 retire(a);assert.ok(saveRetiredCareer(a,{storage:store}).ok);
 const envelope=JSON.parse(store.getItem(CAREER_LIBRARY_KEY));delete envelope.careers[0].state.developmentState;delete envelope.careers[0].state.player.developmentTraits;
 store.setItem(CAREER_LIBRARY_KEY,JSON.stringify(envelope));const old=store.getItem(CAREER_LIBRARY_KEY);
 const saved=readCareerLibrary(store).careers[0].state;
 assert.equal(saved.careerId,id);assert.notEqual(store.getItem(CAREER_LIBRARY_KEY),old);
 assert.deepEqual(readCareerLibrary(store).careers[0].state.player.developmentTraits,saved.player.developmentTraits);
});
test('peakAgeの前後は連続し、同能力でも個人の時間軸・能力別衰えが異なる',()=>{
 const s=adult();
 for(const age of [12,18,25,26,s.player.peakAge+1]){
  s.age=age-.000001;const a=ageGrowthBase(s);s.age=age+.000001;assert.ok(Math.abs(ageGrowthBase(s)-a)<.00001);
 }
 s.age=30;s.player.peakAge=26;assert.ok(ageGrowthBase(s)<0);s.player.peakAge=35;assert.ok(ageGrowthBase(s)>0);
 assert.ok(declineMultiplier(s,'speed')>declineMultiplier(s,'control'));
 s.player.developmentTraits.longevity=1;const slow=declineMultiplier(s,'meet');s.player.developmentTraits.longevity=0;assert.ok(declineMultiplier(s,'meet')>slow);
});
test('晩成は若年で過剰成長せず、consistencyは成長分散を調節する',()=>{
 const late=adult(123,'high');late.age=16;late.year=2024;late.environmentId='mirai';late.player.growthPhase='late';
 const early=structuredClone(late);early.player.growthPhase='early';
 assert.ok(magnitude(grow(late,environment(late)))<magnitude(grow(early,environment(early))));
 late.player.developmentTraits.consistency=1;const stable=growthVariance(late);late.player.developmentTraits.consistency=0;assert.ok(growthVariance(late)>stable);
});
test('長期療養は成長を抑え、発症した期にも適用。怪我による成長抑制を二重適用しない',()=>{
 const healthy=adult(),sick=structuredClone(healthy);
 sick.health={name:'長期リハビリ',daysLeft:500,totalDays:500,severe:true};
 const healthyGain=grow(healthy,environment(healthy)),sickGain=grow(sick,environment(sick));
 assert.ok(magnitude(sickGain)<magnitude(healthyGain)*.15);
 const before=structuredClone(sick.player.abilities);
 applyNewInjuryGrowth(sick,sickGain,{lost:1});assert.deepEqual(sick.player.abilities,before);
 const start=adult();const changes=grow(start,environment(start)),gain=magnitude(changes);
 applyNewInjuryGrowth(start,changes,{lost:.8});assert.ok(magnitude(changes)<gain*.3);
 assert.ok(Object.values(start.player.abilities).every(v=>v>=45),'短中期の怪我は能力低下イベントではない');
});
test('怪我耐性が通常・代表のそれぞれの発生判定へ一度作用する',()=>{
 const s=adult();s.player.developmentTraits.injuryResistance=0;const risk=injuryProbability(s);s.player.developmentTraits.injuryResistance=1;
 assert.ok(injuryProbability(s)<risk);assert.ok(developmentInjuryModifier(s)>0);
 let low=0,high=0;
 for(let seed=1;seed<=400;seed++){
  const a=adult(seed*731,'pro');a.nationalOffers=[{year:a.year,name:'世界野球選手権'}];a.player.developmentTraits.injuryResistance=0;
  const b=structuredClone(a);b.player.developmentTraits.injuryResistance=1;
  decideNational(a,true);decideNational(b,true);
  if(a.seasonImpact.loss)low++;if(b.seasonImpact.loss)high++;
 }
 assert.ok(low>high&&high>0);
});
test('海外大学の適応差は国内より大きく、重圧は軽い補正に留まる',()=>{
 const low=adult(),high=structuredClone(low);low.player.developmentTraits.adaptability=0;high.player.developmentTraits.adaptability=1;
 prepareDevelopmentGrowth(low,environment(low));prepareDevelopmentGrowth(high,environment(high));
 const overseas=developmentGrowthModifier(high,environment(high),'meet')/developmentGrowthModifier(low,environment(low),'meet');
 low.stage=high.stage='university';prepareDevelopmentGrowth(low,environment(low));prepareDevelopmentGrowth(high,environment(high));
 const domestic=developmentGrowthModifier(high,environment(high),'meet')/developmentGrowthModifier(low,environment(low),'meet');
 assert.ok(overseas>domestic);
 low.player.developmentTraits.pressureResistance=0;const normal=developmentGrowthModifier(low,environment(low),'meet');
 low.player.developmentTraits.pressureResistance=1;assert.ok(developmentGrowthModifier(low,environment(low),'meet')/normal<1.2);
});
test('独立リーグで実戦とhiddenBreakoutが既存seasonEventへ作用し、上限・回数制限を守る',()=>{
 let triggered=false;
 for(let seed=1;seed<800&&!triggered;seed++){
  const s=adult(seed*191,'independent');s.player.developmentTraits.hiddenBreakout=1;s.current={...emptyStats(),games:75,ab:300,hits:105};
  const low=structuredClone(s);low.player.developmentTraits.hiddenBreakout=0;
  assert.ok(breakoutChance(s)>breakoutChance(low));
  seasonEvent(s);
  if(s.developmentHistory.some(h=>h.type==='BREAKOUT')){
   triggered=true;assert.ok(Object.values(s.player.abilities).filter(v=>v>45).length<=2);
   assert.ok(Object.entries(s.player.abilities).every(([k,v])=>v<=s.player.potential[k]));
   assert.equal(breakoutAvailable(s),false);
   s.developmentHistory=[{type:'BREAKOUT',year:2000},{type:'BREAKOUT',year:2005}];assert.equal(breakoutAvailable(s),false);
  }
 }
 assert.ok(triggered);
});
test('停滞は永久化せず、回復と昇降格の適応を構造化履歴へ記録',()=>{
 const s=adult(),time=s.year;s.developmentState.stagnation={start:time-2,end:time-1,multiplier:.3};
 prepareDevelopmentGrowth(s,environment(s));assert.equal(s.developmentState.stagnation,null);
 assert.ok(s.developmentHistory.some(h=>h.type==='STAGNATION_END'));
 s.stage='mlb';s.developmentState.level='minor';observeDevelopmentRoster(s,{counts:{active:150,farm:0}});
 assert.ok(s.developmentHistory.some(h=>h.reason==='一軍・メジャーへの昇格'));
});
test('同Seed・同操作とセーブ再開が一致し、旧baseline・広告・成績・年俸は未改変',()=>{
 const a=auditCareer(7,'batter','overseas'),b=auditCareer(7,'batter','overseas');
 assert.deepEqual(auditProjection(a),auditProjection(b));
 const s=createPlayer('継続','pitcher',731);advance(s);const copy=validate(structuredClone(s));advance(s);advance(copy);assert.deepEqual(s,copy);
 const hashes=JSON.parse(fs.readFileSync(new URL('../reports/development-protected-files.json',import.meta.url)));
 // UI is explicitly in scope for the public-site task; historical snapshots remain unchanged.
 for(const [name,hash] of Object.entries(hashes).filter(([name])=>name!=='ui'&&name!=='share'))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../dist/src/'+name+'.js',import.meta.url))).digest('hex'),hash,name);
});
