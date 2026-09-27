import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';
import {simulateStats,productionForm,avg,ops} from '../dist/src/stats.js';
import {simulateDailyRoster} from '../dist/src/roster.js';
function player(seed=12,role='batter',rating=80){
 const s=createPlayer('分布検証',role,seed);Object.assign(s,{stage:'pro',age:28,year:2036,contractStatus:'registered'});
 delete s.player.recordTalent;for(const k in s.player.abilities)s.player.abilities[k]=rating;
 s.player.batterRole='regular';s.player.pitchRole='starter';return s;
}
test('年度変動はSeed再現可能でセーブ項目・乱数・能力を変更しない',()=>{
 const s=player(),before=structuredClone(s),copy=structuredClone(s);
 assert.equal(productionForm(s),productionForm(copy));assert.deepEqual(s,before);
 assert.deepEqual(simulateStats(s,140,64),simulateStats(copy,140,64));assert.equal(s.seed,copy.seed);
});
test('安定性は能力の期待値を変えずに年度変動の分散を抑える',()=>{
 const stable=[],volatile=[];
 for(let i=1;i<=2000;i++){const s=player(Math.imul(i,2654435761)>>>0);s.player.developmentTraits.consistency=1;stable.push(productionForm(s));s.player.developmentTraits.consistency=0;volatile.push(productionForm(s));}
 const mean=a=>a.reduce((n,v)=>n+v,0)/a.length,variance=a=>a.reduce((n,v)=>n+(v-mean(a))**2,0)/a.length;
 assert.ok(variance(stable)<variance(volatile)*.4);assert.ok(Math.abs(mean(stable)-mean(volatile))<.1);
});
test('能力差は年変動より優位で、50本・高OPSを高能力でも常態化させない',()=>{
 let low=0,high=0,extreme=0;const rates=[];
 for(let i=1;i<=1500;i++){const seed=Math.imul(i,2654435761)>>>0,a=simulateStats(player(seed,'batter',55),140,64),b=simulateStats(player(seed,'batter',95),140,64);low+=ops(a);high+=ops(b);if(b.hr>=50||ops(b)>=1.1)extreme++;rates.push(avg(b));}
 assert.ok(high/1500>low/1500+.15);assert.ok(extreme/1500<.03);assert.ok(Math.max(...rates)-Math.min(...rates)>.08);
});
test('学生の成績は追加した安定性・年度変動に影響されない',()=>{
 const s=player(),copy=structuredClone(s);s.stage=copy.stage='high';s.player.developmentTraits.consistency=1;copy.player.developmentTraits.consistency=0;
 assert.deepEqual(simulateStats(s,20,50),simulateStats(copy,20,50));assert.equal(s.seed,copy.seed);
});
test('試合数0・専門起用・先発と救援の記録の整合性を維持する',()=>{
 const s=player();assert.equal(simulateStats(s,0,64).ab,0);
 s.player.batterRole='runner';const runner=simulateStats(s,90,64);assert.ok(runner.ab<60);
 const a=player(62,'pitcher'),b=structuredClone(a);b.player.pitchRole='closer';const starter=simulateStats(a,28,64),closer=simulateStats(b,60,64);
 assert.ok(starter.outs>closer.outs);assert.ok(closer.saves>0);assert.equal(starter.saves,0);
 for(const r of [starter,closer]){assert.ok(r.so<=r.outs);assert.ok(r.wins+r.losses<=r.games);assert.ok(r.runsAllowed>=r.er);assert.ok(r.allowedHr<=r.allowedHits);}
});
test('海外先発の登板間隔は6日以上、登録日数と登板履歴は維持する',()=>{
 const s=player(923,'pitcher',99);s.stage='mlb';const r=simulateDailyRoster(s,1);
 const days=r.days.filter(d=>d.played).map(d=>d.day);
 assert.ok(days.every((d,i)=>!i||d-days[i-1]>=6));assert.ok(r.games.first+r.games.second<=32);
 assert.equal(r.games.first,r.days.filter(d=>d.played&&d.level==='first').length);assert.equal(r.days.length,187);
});
