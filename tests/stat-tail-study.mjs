// Conditional stress sample, NOT population odds: max abilities and record talent.
import fs from 'node:fs';
import {createPlayer} from '../dist/src/engine.js';
import {simulateStats,avg,ops,era,whip} from '../dist/src/stats.js';
const n=20000,counts={avg350:0,hr50:0,rbi150:0,ops1100:0,eraUnder2:0,wins20:0,so250:0,whipUnder1:0},max={hr:0,hits:0,rbi:0,wins:0,so:0,saves:0},roles={};
for(const role of ['batter','pitcher']){
 for(let i=1;i<=n;i++){
  const s=createPlayer('極端値検証',role,Math.imul(i,2654435761)>>>0);Object.assign(s,{age:28,year:2036,stage:'pro'});
  for(const k in s.player.abilities)s.player.abilities[k]=99;s.player.batterRole='regular';s.player.pitchRole='starter';s.player.recordTalent={mode:'multi',focus:0};
  const r=simulateStats(s,role==='batter'?143:30,64);
  if(role==='batter'){counts.avg350+=avg(r)>=.35;counts.hr50+=r.hr>=50;counts.rbi150+=r.rbi>=150;counts.ops1100+=ops(r)>=1.1;}
  else {counts.eraUnder2+=era(r)<2;counts.wins20+=r.wins>=20;counts.so250+=r.so>=250;counts.whipUnder1+=whip(r)<1;}
  for(const k in max)max[k]=Math.max(max[k],r[k]);
 }
}
const report={conditional:true,description:'20,000 max-ability record-talent seasons per role, pro age28, 143 batter games/30 starts. Not actual-career incidence.',seasonsPerRole:n,counts,percent:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,v/n*100])),max};
fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/stats-tail.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
