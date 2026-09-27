import fs from 'node:fs';
import {auditCareer} from './audit-scenarios.mjs';
import {studyRetirement,studyRow,summarizeStudy} from './development-study.mjs';
import {avg,obp,slg,ops,era,whip,sumStats} from '../dist/src/stats.js';
const label=process.argv[2]||'after',count=Number(process.argv[3]||1000),careers=[],rows=[],totals=[];
const routes=['pro','university','overseas','corporate','independent'];
const round=n=>+n.toFixed(4);
const quantiles=a=>{a=a.filter(Number.isFinite).sort((a,b)=>a-b);return {n:a.length,mean:round(a.reduce((x,y)=>x+y,0)/(a.length||1)),p50:a[Math.floor((a.length-1)*.5)]??0,p90:a[Math.floor((a.length-1)*.9)]??0,p99:a[Math.floor((a.length-1)*.99)]??0,max:a.at(-1)??0};};
function values(st){return {...st,avg:avg(st),obp:obp(st),slg:slg(st),ops:ops(st),era:era(st),whip:whip(st),ip:st.outs/3,freePasses:st.allowedWalks+st.allowedHbp};}
for(let i=0;i<count;i++){
 const seed=Math.imul(i+1,2654435761)>>>0,role=i%2?'pitcher':'batter',route=routes[i%5];
 const s=auditCareer(seed,role,route,null,{shouldRetire:studyRetirement});
 careers.push(studyRow(s,seed,role,route));
 const pro=s.records.filter(r=>['pro','mlb'].includes(r.stage)&&!r.partial);
 totals.push({role,genius:s.player.genius,injuryCount:s.injuries.length,long:pro.some(r=>r.age>=40),...values(sumStats(pro))});
 for(const r of pro){rows.push({seed,role,genius:s.player.genius,level:r.stage,age:r.age,roleId:role==='batter'?r.batterRole:r.pitchRole,...values(r.stats)});if(r.levels?.second)rows.push({seed,role,genius:s.player.genius,level:r.stage==='pro'?'farm':'minor',age:r.age,...values(r.levels.second)});}
 if((i+1)%100===0)console.log(label+' '+(i+1)+'/'+count);
}
const summarize=rs=>{
 const bat=rs.filter(r=>r.role==='batter'&&r.ab>=440),pitch=rs.filter(r=>r.role==='pitcher'&&r.outs>=429);
 const metrics=(rs,keys)=>Object.fromEntries(keys.map(k=>[k,quantiles(rs.map(r=>r[k]))]));
 const extremes=(rs,tests)=>Object.fromEntries(Object.entries(tests).map(([k,fn])=>[k,{n:rs.filter(fn).length,denominator:rs.length,pct:round(rs.filter(fn).length/(rs.length||1)*100)}]));
 return {batting:metrics(bat,['avg','obp','slg','ops','hits','hr','rbi','sb','bb','so','games','ab']),pitching:metrics(pitch,['era','wins','losses','ip','so','whip','allowedHits','allowedHr','freePasses']),appearances:metrics(rs.filter(r=>r.games>0),['games','ab','ip','saves','holds']),extremeBat:extremes(bat,{avg350:r=>r.avg>=.350,hr50:r=>r.hr>=50,rbi150:r=>r.rbi>=150,ops1100:r=>r.ops>=1.1}),extremePitch:extremes(pitch,{eraUnder2:r=>r.era<2,wins20:r=>r.wins>=20,so250:r=>r.so>=250,whipUnder1:r=>r.whip<1})};
};
const report={count,policy:'Same 1000 distinct seeds and existing studyRetirement policy; batting rate thresholds AB>=440, pitching thresholds IP>=143; farm/minor reported separately.',career:summarizeStudy(careers),careerRows:careers,levels:Object.fromEntries(['pro','mlb','farm','minor'].map(level=>[level,summarize(rows.filter(r=>r.level===level))])),combined:summarize(rows.filter(r=>['pro','mlb'].includes(r.level))),totals:Object.fromEntries(['batter','pitcher'].map(role=>[role,Object.fromEntries(['all','genius','nonGenius','long','injuryProne'].map(group=>[group,Object.fromEntries(['hits','hr','rbi','sb','wins','ip','so','saves'].map(k=>[k,quantiles(totals.filter(r=>r.role===role&&(group==='all'||group==='genius'&&r.genius||group==='nonGenius'&&!r.genius||group==='long'&&r.long||group==='injuryProne'&&r.injuryCount>=5)).map(r=>r[k]))]))]))])),rows};
fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/stats-'+label+'.json',JSON.stringify(report));console.log(JSON.stringify({career:report.career.all,extremeBat:report.combined.extremeBat,extremePitch:report.combined.extremePitch}));
