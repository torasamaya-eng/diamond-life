import fs from 'node:fs';
import {createSession,finishDraft} from '../dist/draft/draft.js';
import {simulateCareer} from '../dist/draft/career.js';
import {average} from '../dist/draft/candidates.js';
import {rates} from '../dist/draft/stats.js';
const count=Number(process.env.DRAFT_SIM_COUNT||1000),groups={};let duplicatePicks=0,unfinished=0,injuryFull=0,totalErrors=0,statErrors=0;const examples={},fixtures={};
function validate(s,role){const values=Object.values(s);if(values.some(x=>!Number.isInteger(x)||x<0)||s.hr+s.doubles+s.triples>s.hits||s.hits+s.so>s.ab&&role==='野手'||s.so>s.outs&&role==='投手'||s.er>s.runs||s.hra>s.ha)statErrors++;}
function record(label,c,r){const g=groups[label]??={n:0,value:0,stars:0,busts:0,injuries:0,years:0};g.n++;g.value+=r.value;g.stars+=r.value>=55;g.busts+=r.value<8;g.injuries+=r.injuries.length;g.years+=r.years;}
const correlations=[];
for(let seed=1;seed<=count;seed++){
 const s=finishDraft(createSession(seed));if(s.picks.length!==60)unfinished++;if(new Set(s.picks.map(x=>x.id)).size!==s.picks.length)duplicatePicks++;for(const c of s.candidates)for(const y of c.history){validate(y.stats,c.role);for(const st of Object.values(y.situations))validate(st,c.role);}
 // All 60 drafted players, including CPU lower picks: no selection bias toward the user.
 for(const p of s.picks){const c=s.candidates.find(x=>x.id===p.id),r=simulateCareer(c,p,seed);record('all',c,r);record(p.development?'development':`round${p.round}`,c,r);record(c.category,c,r);record(c.medical.some(m=>m.days>=100)?'medical-serious':'medical-other',c,r);record(c.trend>1?'trend-up':'trend-other',c,r);if(c.family)record('family',c,r);if(c.representative)record('representative',c,r);if(c.height>=188)record('tall',c,r);if(c.height>=187&&c.weight<81)record('unfinished-frame',c,r);correlations.push([77-c.rank,r.value]);
  const ys=c.history,last=ys.at(-1),hs=ys[2],a=c.hidden.current,clue=c.role==='投手'?'velocity':'exitVelocity',improving=ys.every((y,i)=>!i||y[clue]>=ys[i-1][clue]);
  const conditions={A:c.category==='大学'&&c.role==='投手'&&improving,B:c.category==='大学'&&c.hidden.curve==='early'&&hs.velocity>148&&last.velocity<hs.velocity-2,C:c.category==='大学'&&c.hidden.curve==='rebound'&&ys.slice(3,6).some(y=>y.slump)&&!last.slump,D:c.category==='社会人'&&c.hidden.curve==='corporate'&&c.trend>1,E:c.category==='独立'&&c.hidden.curve==='independent'&&c.trend>1,F:c.family&&c.rank<=28&&r.value<8,G:c.family&&r.value>=55,H:c.role==='投手'&&c.medical.length&&average(a)>65,I:c.rank>40&&improving&&c.trend>1,J:c.category==='高校'&&c.height>=187&&c.weight<=80&&c.hidden.potential-average(a)>15,K:c.category==='高校'&&average(a)>60&&c.hidden.potential-average(a)<8,L:c.position==='捕手'&&a.power>70&&a.field<58,M:c.role==='投手'&&a.stuff>65&&a.stamina<55,N:c.role==='投手'&&last.national&&rates(last.stats).era<2.5&&rates(last.national.stats).era>5,O:!!c.representative,P:p.development&&r.value>=55};
  for(const [key,ok]of Object.entries(conditions))if(ok&&!fixtures[key])fixtures[key]={seed,id:c.id,round:p.round,development:p.development,rank:c.rank,name:c.name,category:c.category,value:r.value};
  const label=p.development&&r.value>=55?'development-star':p.round===1&&r.value<8?'first-bust':c.family&&r.value<8?'family-bust':c.family&&r.value>=55?'family-star':c.medical.length&&r.value>=55?'injured-star':null;if(label&&!examples[label])examples[label]={seed,id:c.id,name:c.name,rank:c.rank,trend:c.trend,value:r.value,clues:{velocity:c.velocity,exitVelocity:c.exitVelocity,height:c.height,history:c.history.map(y=>({age:y.age,velocity:y.velocity,weight:y.weight}))}};
  for(const y of r.rows){validate(y.stats,r.role);validate(y.farm,r.role);if(y.injuryDays>=210&&y.stats.games+y.farm.games)injuryFull++;}if(r.totalSalary!==r.rows.reduce((n,y)=>n+y.salary,0))totalErrors++;
 }
 if(seed%100===0)console.log(`${seed}/${count} drafts`);
}
const n=correlations.length,mx=correlations.reduce((s,x)=>s+x[0],0)/n,my=correlations.reduce((s,x)=>s+x[1],0)/n;
const correlation=correlations.reduce((s,x)=>s+(x[0]-mx)*(x[1]-my),0)/Math.sqrt(correlations.reduce((s,x)=>s+(x[0]-mx)**2,0)*correlations.reduce((s,x)=>s+(x[1]-my)**2,0));
for(const g of Object.values(groups)){g.meanValue=g.value/g.n;g.starRate=g.stars/g.n;g.bustRate=g.busts/g.n;g.injuryRatePerYear=g.injuries/g.years;}
const out={drafts:count,careers:n,groups,publicOutcomeCorrelation:correlation,examples,fixtures,invariants:{duplicatePicks,unfinished,injuryFull,totalErrors,statErrors}};fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/draft-simulation.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));if(Object.values(out.invariants).some(Boolean))process.exitCode=1;
