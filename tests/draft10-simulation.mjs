import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as currentDraft from '../dist/draft/draft.js';
import * as currentCareer from '../dist/draft/career.js';
import * as previousDraft from '../reports/draft10-before/draft.js';
import * as previousCareer from '../reports/draft10-before/career.js';
import {fitNeeds} from '../dist/draft/teams.js';
import {rates,sum} from '../dist/draft/stats.js';

const count=Number(process.argv[2]||1000);
function correlation(pairs){
 const n=pairs.length,mx=pairs.reduce((s,p)=>s+p[0],0)/n,my=pairs.reduce((s,p)=>s+p[1],0)/n;
 const xx=pairs.reduce((s,p)=>s+(p[0]-mx)**2,0),yy=pairs.reduce((s,p)=>s+(p[1]-my)**2,0);
 return pairs.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0)/Math.sqrt(xx*yy);
}
function collect(draft,career){
 const out={drafts:count,careers:0,averageFirstTierInFirstRound:0,allFirstTierGone:0,firstPickNeedMatch:0,firstCPUPicks:0,classification:{},groups:{},patterns:{popularDisappointment:0,lowerTierStar:0,developmentStar:0,persistentStagnation:0,stagnationRecovery:0},examples:{},invariants:{unfinished:0,duplicatePicks:0,invalidStats:0,wrongTotal:0,wrongSalary:0,fullInjuryGames:0}},pairs=[];
 const group=(label,r)=>{const g=out.groups[label]??={n:0,regular:0,star:0,meanYears:0};g.n++;g.regular+=Number(r.evaluation.rank>=3);g.star+=Number(r.evaluation.rank>=4);g.meanYears+=r.years;};
 const validate=(s,role)=>{if(Object.values(s).some(v=>!Number.isInteger(v)||v<0)||s.hr+s.doubles+s.triples>s.hits||role==='野手'&&s.hits+s.so>s.ab||role==='投手'&&s.so>s.outs||s.er>s.runs||s.hra>s.ha)out.invariants.invalidStats++;};
 const example=(type,c,r,seed)=>{out.patterns[type]++;out.examples[type]??={seed,id:c.id,name:c.name,tier:c.tier,surveys:c.surveys,round:r.pick.round,classification:r.classification,years:r.years,events:r.events.filter(e=>['SLUMP','REPAIR','ADAPTATION','ADAPTATION_SUCCESS'].includes(e.type)).slice(0,5)};};
 for(let seed=1;seed<=count;seed++){
  const s=draft.createSession(seed);draft.startDraft(s);
  const interest=new Map(s.candidates.filter(c=>draft.eligible(c,1)).map(c=>[c.id,draft.firstCompetition(s,c.id).filter(t=>t!==s.playerTeam).length]));
  draft.finishDraft(s);
  if(s.picks.length!==60)out.invariants.unfinished++;
  if(new Set(s.picks.map(p=>p.id)).size!==60)out.invariants.duplicatePicks++;
  const first=s.picks.filter(p=>p.round===1&&!p.development),firstTier=first.filter(p=>s.candidates.find(c=>c.id===p.id).tier==='1位候補').length;
  out.averageFirstTierInFirstRound+=firstTier;if(firstTier===12)out.allFirstTierGone++;
  for(const p of first.filter(p=>p.team!==s.playerTeam)){out.firstCPUPicks++;if(fitNeeds(s.candidates.find(c=>c.id===p.id),s.clubs[p.team].needs).length)out.firstPickNeedMatch++;}
  for(const p of s.picks){
   const c=s.candidates.find(c=>c.id===p.id),r=career.simulateCareer(c,p,seed,null,{honors:false});out.careers++;
   out.classification[r.classification]=(out.classification[r.classification]||0)+1;
   pairs.push([c.surveys,r.value]);group('all',r);group(c.surveys>=9?'surveys9plus':c.surveys<=4?'surveys4minus':'surveys5to8',r);
   if((interest.get(c.id)||0)>=3){group('cpu3plus',r);if(r.evaluation.rank<3)example('popularDisappointment',c,r,seed);}else if(!interest.get(c.id))group('cpu0',r);
   if(c.rank>28&&r.evaluation.rank>=4)example('lowerTierStar',c,r,seed);
   if(p.development&&r.evaluation.rank>=4)example('developmentStar',c,r,seed);
   if(r.rows.some((y,i)=>y.development?.stagnating&&r.rows[i+1]?.development?.stagnating))example('persistentStagnation',c,r,seed);
   if(r.events.some(e=>e.type==='STAGNATION_RECOVERY'))example('stagnationRecovery',c,r,seed);
   if(JSON.stringify(r.total)!==JSON.stringify(sum(r.rows.map(y=>y.stats))))out.invariants.wrongTotal++;
   if(r.totalSalary!==r.rows.reduce((n,y)=>n+y.salary,0))out.invariants.wrongSalary++;
   for(const y of r.rows){validate(y.stats,r.role);validate(y.farm,r.role);if(y.injuryDays>=210&&y.stats.games+y.farm.games)out.invariants.fullInjuryGames++;assert.ok(Number.isFinite(rates(y.stats).ops));}
  }
  if(seed%100===0)console.log(`${draft===currentDraft?'after':'before'} ${seed}/${count}`);
 }
 out.averageFirstTierInFirstRound/=count;out.firstPickNeedMatch/=out.firstCPUPicks;
 out.surveyCareerCorrelation=correlation(pairs);
 for(const g of Object.values(out.groups)){g.regularRate=g.regular/g.n;g.starRate=g.star/g.n;g.meanYears/=g.n;}
 assert.ok(Object.values(out.invariants).every(n=>n===0));return out;
}
const report={before:collect(previousDraft,previousCareer),after:collect(currentDraft,currentCareer)};
fs.writeFileSync(`reports/draft10-comparison-${count}.json`,JSON.stringify(report,null,2));
for(const [model,out] of Object.entries(report))console.log(JSON.stringify({model,careers:out.careers,averageFirstTierInFirstRound:out.averageFirstTierInFirstRound,firstPickNeedMatch:out.firstPickNeedMatch,surveyCareerCorrelation:out.surveyCareerCorrelation,groups:out.groups,patterns:out.patterns,invariants:out.invariants},null,2));
