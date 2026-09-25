import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createPlayer,advance,environment} from '../dist/src/engine.js';
import {majorReady} from '../dist/src/development.js';
import {grow,declineMultiplier} from '../dist/src/growth.js';
import {legacyHonors,retiredNumberEligible} from '../dist/src/awards.js';
import {emptyStats} from '../dist/src/stats.js';
import {auditCareer} from './audit-scenarios.mjs';
import {studyRetirement,studyRow} from './development-study.mjs';
const before=JSON.parse(fs.readFileSync(new URL('../reports/balance-tuning-before.json',import.meta.url)));
const career=(seed,role,route)=>studyRow(auditCareer(seed,role,route,null,{shouldRetire:studyRetirement}),seed,role,route);
function player(rating=78){
 const s=createPlayer('バランス確認','batter',71);
 Object.assign(s,{stage:'mlb',year:2031,age:23,grade:1,team:'海外テスト球団'});
 s.player.arc='ordinary';s.player.arcEvent=true;
 for(const key in s.player.abilities){s.player.abilities[key]=rating;s.player.potential[key]=99;}
 s.player.developmentTraits.adaptability=.5;
 return s;
}

test('UI以外の指定ファイル・天才生成・旧audit baselineを変更しない',()=>{
 // UI is explicitly in scope for the public-site task; historical snapshots remain unchanged.
 for(const [name,hash] of Object.entries(before.hashes).filter(([name])=>name!=='ui'))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../dist/src/'+name+'.js',import.meta.url))).digest('hex'),hash,name);
 assert.equal(fs.readFileSync(new URL('../dist/src/archetypes.js',import.meta.url),'utf8'),before.sources.archetypes);
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('./audit-baseline.json',import.meta.url))).digest('hex'),before.baselineHash);
});

test('同じ能力・traitに天才フラグ専用の減点を掛けない',()=>{
 const a=createPlayer('A','pitcher',774553834),b=structuredClone(a);
 assert.ok(a.player.genius);b.player.genius=false;
 a.age=b.age=8;a.year=b.year=2016;
 assert.deepEqual(grow(a,environment(a)),grow(b,environment(b)));
 assert.deepEqual(a.player.abilities,b.player.abilities);
});

test('海外トップ選考は適応・国内実績・マイナー実績・年齢に反応し、乱数を消費しない',()=>{
 const s=player(),seed=s.seed;assert.equal(majorReady(s),false);
 s.player.developmentTraits.adaptability=1;assert.equal(majorReady(s),true);
 s.player.developmentTraits.adaptability=.5;
 const good={...emptyStats(),games:100,ab:350,hits:120};
 s.records=[{year:2030,stage:'mlb',stats:emptyStats(),levels:{second:good}}];
 assert.equal(majorReady(s),true);
 s.age=40;assert.equal(majorReady(s),false);
 s.age=23;s.records=[{year:2030,stage:'pro',stats:good}];
 for(const key in s.player.abilities)s.player.abilities[key]=81;
 assert.equal(majorReady(s),true);assert.equal(s.seed,seed);
});

test('海外契約だけではメジャー出場せず、マイナーで実戦と成長を継続できる',()=>{
 const s=player(65);assert.equal(advance(s),true);
 assert.equal(s.records[0].stats.games,0);
 assert.ok(s.records[0].levels.second.games>0);
 assert.equal(s.records[0].dailyRoster.counts.active,0);
 const injured=player(65);injured.health={name:'長期療養',daysLeft:500,totalDays:500,severe:false};
 assert.equal(advance(injured),true);
 assert.equal(injured.records[0].mlbServiceDays,0,'未昇格の全休をメジャーIL在籍にしない');
});

test('永久欠番は長期在籍・大記録・複数年タイトル・大きな栄誉を併せて要求',()=>{
 const s=player();s.stage='pro';s.year=2045;
 s.records=Array.from({length:14},(_,i)=>({year:2030+i,stage:'pro',team:s.team,number:7,stats:{...emptyStats(),games:140,ab:550,hits:190,hr:30}}));
 assert.equal(retiredNumberEligible(s,s.team,s.records),false);
 s.awards=[{year:2030,title:'本塁打王'},{year:2031,title:'打点王'},{year:2032,title:'最多安打'},{year:2033,title:'本塁打王'}].map(a=>({...a,team:s.team}));
 assert.equal(retiredNumberEligible(s,s.team,s.records),false);
 s.awards.push({year:2033,title:'最優秀選手（MVP）',team:s.team});
 assert.equal(retiredNumberEligible(s,s.team,s.records),true);
 assert.equal(retiredNumberEligible(s,s.team,s.records.slice(0,8)),false);
 legacyHonors(s);assert.ok(s.honors.some(h=>h.title==='名球会入り'));
 assert.ok(s.honors.some(h=>h.title==='永久欠番'));
 const honors=structuredClone(s.honors);s.records=[];legacyHonors(s);assert.deepEqual(s.honors,honors,'保存済み栄誉を取り消さない');
});

test('長寿だけで老化を止めず、健康・既存の衰え速度も維持期へ作用',()=>{
 const s=player();s.player.developmentTraits.longevity=1;s.player.developmentTraits.injuryResistance=1;
 const healthy=declineMultiplier(s,'speed');assert.ok(healthy>0);
 s.injuries=[{severe:true}];assert.ok(declineMultiplier(s,'speed')>healthy);
 s.injuries=[];s.player.developmentTraits.longevity=0;assert.ok(declineMultiplier(s,'speed')>healthy);
});

test('実際のSeed進行から天才未到達・短命・海外不振と非天才の成功が生まれる',()=>{
 const noPro=career(774553834,'pitcher','independent');assert.ok(noPro.genius&&!noPro.pro);
 const brief=career(2740761557,'batter','university');assert.ok(brief.genius&&brief.pro&&brief.proSeasons<=5);
 const abroad=career(2192218355,'batter','overseas');assert.ok(abroad.genius&&abroad.patterns.overseasFailure);
 const ordinary=career(3041712678,'pitcher','pro');assert.ok(!ordinary.genius&&ordinary.star);
});
