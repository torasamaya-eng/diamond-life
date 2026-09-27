import fs from 'node:fs';import {auditCareer} from './audit-scenarios.mjs';import {studyRetirement,studyRow} from './development-study.mjs';
const salaries=[],careers=[],samples=[],recovery=[];const count=Number(process.argv[2]||1000);
for(let i=0;i<count;i++){
 const seed=Math.imul(i+1,2654435761)>>>0,role=i%2?'pitcher':'batter',route=['pro','university','overseas','corporate','independent'][i%5];
 const s=auditCareer(seed,role,route,null,{shouldRetire:studyRetirement});careers.push(studyRow(s,seed,role,route));
 for(const r of s.records.filter(r=>r.stage==='pro'&&!r.partial))salaries.push({seed,age:r.age,role,pay:r.salary,status:r.contractStatus,games:r.stats.games,ab:r.stats.ab,outs:r.stats.outs});
 if(s.timeline.some(t=>t.text.includes('育成再契約')))recovery.push({seed,name:s.player.name,events:s.timeline.filter(t=>/育成再契約|支配下選手へ復帰|手術/.test(t.text))});
}
const registered=salaries.filter(r=>r.status!=='development').map(r=>r.pay).sort((a,b)=>a-b),development=salaries.filter(r=>r.status==='development').map(r=>r.pay).sort((a,b)=>a-b);
const summary=a=>({n:a.length,mean:a.reduce((x,y)=>x+y,0)/(a.length||1),median:a[Math.floor(a.length/2)],max:a.at(-1),min:a[0]});
const result={count,registered:summary(registered),development:summary(development),rehabCareers:recovery.length,recovery,briefGenius:careers.filter(c=>c.genius&&c.pro&&c.proSeasons<=5),careers,salaries};
fs.writeFileSync('reports/contracts-study-'+count+'.json',JSON.stringify(result));console.log(JSON.stringify({registered:result.registered,development:result.development,rehabCareers:result.rehabCareers,briefGenius:result.briefGenius.map(c=>({seed:c.seed,role:c.role,route:c.requestedRoute,years:c.proSeasons}))}));
