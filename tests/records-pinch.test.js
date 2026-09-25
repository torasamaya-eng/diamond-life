import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';
import {assignBatterRole,playerLabel} from '../dist/src/profile.js';
import {simulateStats,emptyStats} from '../dist/src/stats.js';
import {salaryEstimate} from '../dist/src/contracts.js';
import {checkSeasonRecords,recordStrength,RECORD_TARGETS} from '../dist/src/records.js';
function fixture(seed=912){
 const s=createPlayer('記録検証','batter',seed);
 Object.assign(s,{age:28,stage:'pro',year:2032,salary:1600,proYears:6,activeContract:null,contractStatus:'registered'});
 delete s.player.recordTalent;
 for(const key in s.player.abilities)s.player.abilities[key]=85;
 Object.assign(s.player,{position:'first',naturalPosition:'first',batterRole:'regular'});
 return s;
}
test('打撃特化・晩年は代打、勝負強い強打者は切り札、DHと確約と育成を区別',()=>{
 const s=fixture();Object.assign(s.player.abilities,{field:20,arm:30,speed:25});
 assignBatterRole(s);assert.equal(s.player.batterRole,'pinchAce');assert.match(playerLabel(s),/代打の切り札/);
 s.player.position='dh';assignBatterRole(s);assert.equal(s.player.batterRole,'regular');
 s.age=38;Object.assign(s.player.abilities,{meet:65,power:65,eye:65});assignBatterRole(s);assert.equal(s.player.batterRole,'pinch');
 s.activeContract={endYear:2033,guarantees:{regular:true}};assignBatterRole(s);assert.equal(s.player.batterRole,'regular');
 s.contractStatus='development';assignBatterRole(s);assert.equal(s.player.batterRole,'reserve');
 s.activeContract=null;s.contractStatus='registered';s.player.position='first';s.age=25;s.player.abilities.field=s.player.abilities.arm=s.player.abilities.speed=75;assignBatterRole(s);assert.equal(s.player.batterRole,'regular');
});
test('代打は1試合約1打数で守備走塁と年俸を過大評価しない',()=>{
 const s=fixture();s.player.batterRole='pinchAce';const st=simulateStats(s,90);
 assert.ok(st.ab>=80&&st.ab<=100);assert.ok(st.sb<5);assert.ok(st.defenseRuns<2);
 const record={stats:st,batterRole:'pinchAce'};
 assert.ok(salaryEstimate(s,record,true)<=6000);
});
test('記録型の抽選は約30人に1人で複数型と特化型を含み、天才とは独立',()=>{
 let count=0,multi=0,genius=0,both=0;
 for(let i=1;i<=12000;i++){
  const s=createPlayer('抽選','batter',i*16411);
  if(s.player.recordTalent){count++;if(s.player.recordTalent.mode==='multi')multi++;if(s.player.genius)both++;}
  if(s.player.genius)genius++;
 }
 assert.ok(count>320&&count<480,count);assert.ok(multi/count>.25&&multi/count<.45);assert.ok(genius>320&&genius<480);assert.ok(both>0&&both<40);
});
test('特化型は対応する一分野のみ補正、学生と二軍に記録補正はない',()=>{
 const s=fixture();for(const k in s.player.abilities)s.player.abilities[k]=99;
 s.player.recordTalent={mode:'single',focus:1};
 assert.equal(recordStrength(s,'hr'),1);assert.equal(recordStrength(s,'hits'),0);assert.equal(recordStrength(s,'sb'),0);
 s.simulatingFarm=true;assert.equal(recordStrength(s,'hr'),0);
 s.simulatingFarm=false;s.stage='high';assert.equal(recordStrength(s,'hr'),0);
});
test('十分な能力と出場機会があれば実際の生成成績で各世界基準を超えられる',()=>{
 const reached=new Set();
 for(let seed=1;seed<=200;seed++){
  for(const role of ['batter','pitcher']){
   const s=fixture(seed*313);s.stage='mlb';s.player.role=role;s.player.recordTalent={mode:'multi',focus:0};
   for(const k in s.player.abilities)s.player.abilities[k]=99;
   s.player.pitchRole=seed%2?'starter':'closer';
   const r=simulateStats(s,role==='batter'?155:s.player.pitchRole==='starter'?32:70,78);
   assert.ok(r.hits<=r.ab);assert.ok(r.hr+r.doubles+r.triples<=r.hits);assert.ok(r.so<= (role==='pitcher'?r.outs:r.ab-r.hits));assert.ok(r.saves<=r.games);
   for(const t of RECORD_TARGETS.filter(t=>t.role===role))if(r[t.key]>t.world)reached.add(t.key);
  }
 }
 assert.equal(reached.size,5,[...reached].join(','));
});
test('同記録は更新なし、二軍代表は対象外、海外は日本記録に含めず自己更新も保存',()=>{
 const s=fixture();const r={year:2032,age:28,stage:'pro',team:s.team,stats:{...emptyStats(),hr:60,hits:216}};
 checkSeasonRecords(s,r);assert.equal(s.recordHistory.length,0);
 r.stats.hr=74;checkSeasonRecords(s,r);assert.equal(s.recordHistory.length,2);
 checkSeasonRecords(s,r);assert.equal(s.recordHistory.length,2);
 checkSeasonRecords(s,{...r,year:2033,stage:'mlb',stats:{...r.stats,hr:75}});
 assert.equal(s.recordHistory.length,3);assert.equal(s.recordBook['japan:hr'],74);assert.equal(s.recordBook['world:hr'],75);
 for(const stage of ['high','minor','national','independent'])checkSeasonRecords(s,{...r,stage,stats:{...r.stats,hr:200}});
 assert.equal(s.recordHistory.length,3);assert.ok(s.timeline.some(t=>t.text.includes('75')));assert.equal(s.honors.at(-1).age,28);
});
