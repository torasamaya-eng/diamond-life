import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';
import {assignBatterRole,playerLabel} from '../dist/src/profile.js';
import {emptyStats,simulateStats,specialistValue} from '../dist/src/stats.js';
import {salaryEstimate} from '../dist/src/contracts.js';
import {reviewEmployment} from '../dist/src/lifecycle.js';
import {grow} from '../dist/src/growth.js';

function player(seed=123){
 const s=createPlayer('専門要員','batter',seed);
 Object.assign(s,{stage:'pro',age:24,year:2030,proYears:4,salary:1600,contractStatus:'registered',activeContract:null});
 Object.assign(s.player,{position:'shortstop',naturalPosition:'shortstop',style:'defense',arc:'ordinary',growthPhase:'normal',talent:1.4});
 for(const k in s.player.abilities){s.player.abilities[k]=40;s.player.potential[k]=99;}
 return s;
}
test('専門能力とスタイルで起用を分け、DHでは守備固めと表示しない',()=>{
 const s=player();Object.assign(s.player.abilities,{field:95,arm:90,throwing:95,speed:92});
 assignBatterRole(s);assert.equal(s.player.batterRole,'defense');assert.match(playerLabel(s),/守備固め要員/);
 s.player.style='speed';s.player.position='dh';assignBatterRole(s);
 assert.equal(s.player.batterRole,'runner');assert.equal(s.player.position,'shortstop');assert.match(playerLabel(s),/代走要員/);
 s.contractStatus='development';assignBatterRole(s);assert.equal(s.player.batterRole,'reserve');
});
test('専門要員も通常成長で打撃が伸びればレギュラーへ昇格する',()=>{
 for(const style of ['speed','defense']){
  const s=player();s.player.style=style;Object.assign(s.player.abilities,{meet:63.9,power:63.9,eye:63.9,field:95,arm:90,speed:95});
  assignBatterRole(s);assert.ok(['runner','defense'].includes(s.player.batterRole));
  grow(s,{growth:1,competition:64},true);assignBatterRole(s);
  assert.equal(s.player.batterRole,'regular');assert.ok(s.timeline.some(t=>t.text.includes('→ レギュラー')));
 }
});
test('短時間起用の打数・守備貢献をフル出場と同じにしない',()=>{
 const s=player();s.player.abilities.field=95;s.player.batterRole='defense';
 const full=structuredClone(s);full.player.batterRole='regular';
 const a=simulateStats(s,100),b=simulateStats(full,100);
 assert.ok(a.ab<b.ab/2);assert.ok(Math.abs(a.defenseRuns/b.defenseRuns-.35)<.0001);
});
test('専門実績は査定に加算するが少数出場や能力だけでは高額にしない',()=>{
 for(let seed=1;seed<=100;seed++){
  const s=player(seed*7919);
  for(const role of ['defense','runner']){
   const r={batterRole:role,stats:{...emptyStats(),games:100,ab:75,hits:18,doubles:3,bb:6,sb:role==='runner'?25:2,defenseRuns:role==='defense'?3.5:0}};
   const valued=salaryEstimate(structuredClone(s),r,true);
   const unvalued=salaryEstimate(structuredClone(s),{...r,batterRole:'reserve'},true);
   assert.ok(valued>unvalued);assert.ok(valued<=6000);
   const zero={batterRole:role,stats:emptyStats()};
   assert.equal(specialistValue(zero),0);
   assert.equal(salaryEstimate(structuredClone(s),zero,true),salaryEstimate(structuredClone(s),{...zero,batterRole:'reserve'},true));
  }
 }
});
test('一軍で専門実績がある選手は総合能力が低いだけで戦力外にしない',()=>{
 const s=player();s.age=29;s.proYears=5;
 const r={overall:40,batterRole:'runner',stats:{...emptyStats(),games:90,ab:40,hits:10,sb:25}};
 reviewEmployment(s,r);assert.equal(s.employment,null);
});
