import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {auditCareer,auditProjection,AUDIT_CASES} from './audit-scenarios.mjs';
import {performance} from '../dist/src/stats.js';
const PRO=['pro','mlb'];
const routes=['pro','university','overseas','corporate','independent'];
// Shared before/after player-choice policy. This is NOT an automatic retirement rule in the game.
export function studyRetirement(s){
 const last=s.records.at(-1);
 if(!last)return false;
 if(s.injuryAdvice&&s.age>=32)return true;
 if(s.employment&&s.age>=33&&s.employment.options.some(o=>o.role!=='player')&&performance(last.stats,s.player.role)<2)return true;
 if(s.retirementAdvice&&!s.retirementAdvice.answered&&s.age>=35)return true;
 if(!PRO.includes(s.stage)&&s.age>=30&&(!s.pending?.draft||s.pending.draft.score<59||s.age>=33))return true;
 return false;
}
export function studyRow(s,seed,role,requestedRoute){
 const records=s.records.filter(r=>!r.partial),pros=records.filter(r=>PRO.includes(r.stage)),first=pros[0];
 const history=s.developmentHistory||[],event=h=>h.type||h.kind;
 const stages=[...new Set(records.map(r=>r.stage))];
 const entry=s.teams.find(t=>PRO.includes(t.stage));
 const high=records.filter(r=>r.stage==='high'),maxPro=Math.max(0,...pros.map(r=>r.overall));
 const byRoute=Object.fromEntries(routes.filter(route=>stages.includes(route)).map(route=>{
  const rows=records.filter(r=>r.stage===route),start=rows[0].year,end=rows.at(-1).year;
  const growth=s.periodResults.filter(r=>r.stage===route).reduce((total,r)=>{
   const keys=s.player.role==='pitcher'?['velocity','control','stamina','breaking','strikeout']:['meet','power','speed','arm','field','eye','clutch','throwing'];
   return total+keys.reduce((n,k)=>n+(r.changes?.[k]||0),0)/keys.length;
  },0);
  const subsequent=pros.filter(r=>r.year>=(route==='pro'?start:end));
  return [route,{growth,years:rows.length,pro:subsequent.length>0,draft:s.drafts.filter(d=>d.stage===route).map(d=>d.score),proYears:subsequent.length,major:subsequent.some(r=>r.stage==='mlb'&&r.stats.games>0)}];
 }));
 const breakthroughs=history.filter(h=>['BREAKOUT','breakout'].includes(event(h)));
 const indieIndex=s.teams.findIndex(t=>t.stage==='independent'),indieDrafts=s.drafts.filter(d=>d.stage==='independent');
 const independentFacts=indieIndex<0?null:{enteredBeforePro:!s.teams.slice(0,indieIndex).some(t=>PRO.includes(t.stage)),seasons:records.filter(r=>r.stage==='independent').length,noProEver:!first,unselectedYears:indieDrafts.filter(d=>d.type==='指名なし').map(d=>d.year),evaluatedButUnselected:indieDrafts.some(d=>d.score>=59&&d.type==='指名なし')};
 const stagnations=history.filter(h=>['STAGNATION','stagnation'].includes(event(h)));
 const topDraft=s.drafts.some(d=>d.type==='支配下'&&d.rank<=2),lowDraft=s.drafts.some(d=>d.type==='育成'||d.rank>=4);
 const overseas=pros.filter(r=>r.stage==='mlb'),major=overseas.filter(r=>r.stats.games>0),productive=rs=>rs.filter(r=>performance(r.stats,s.player.role)>=3||r.awards?.length||s.awards.some(a=>a.year===r.year)).length;
 const patterns={
  earlyComplete:high.length>0&&high.at(-1).overall>=65&&high.at(-1).overall>=maxPro-8,
  collegeGrowth:['university','overseas'].some(r=>byRoute[r]?.growth>=10),
  corporateBloom:breakthroughs.some(h=>h.stage==='corporate'),
  independentToPro:byRoute.independent?.pro||false,
  noPro:!first,topDraftFailure:topDraft&&productive(pros)===0,
  lowDraftStar:lowDraft&&productive(pros)>=3,
  lateStar:pros.some(r=>r.age>=28&&performance(r.stats,s.player.role)>=4)&&high.at(-1)?.overall<65,
  overseasFailure:overseas.length>0&&productive(major)===0,
  overseasSuccess:productive(major)>=3,
  injurySetback:(s.injuries||[]).some(i=>i.severe),
  longCareer:pros.some(r=>r.age>=40&&r.stats.games>0)
 };
 return {seed,role,requestedRoute,genius:s.player.genius,arc:s.player.arc,stages,byRoute,pro:!!first,
  highSchoolPro:!!entry&&entry.from==='high',entryAge:first?.age??null,
  breakout:breakthroughs.length>0,stagnation:stagnations.length>0,injury:(s.injuries||[]).length>0,
  injuryCount:(s.injuries||[]).length,seasons:records.length,major:major.length>0,overseas:overseas.length>0,proSeasons:pros.length,firstProOverall:first?.overall??null,retirementAge:s.age,
  active35:records.some(r=>r.age>=35&&PRO.includes(r.stage)&&r.stats.games>0),
  active40:patterns.longCareer,legacy:(s.honors||[]).some(h=>h.title==='名球会入り'),
  retiredNumber:(s.honors||[]).some(h=>h.title==='永久欠番'),maxPro,star:productive(pros)>=3,patterns,independentFacts,
  finalHash:createHash('sha256').update(JSON.stringify(auditProjection(s))).digest('hex')};
}
const pct=(rows,key)=>rows.length?+(rows.filter(r=>r[key]).length/rows.length*100).toFixed(2):0;
const mean=values=>values.length?+(values.reduce((a,b)=>a+b,0)/values.length).toFixed(3):null;
export function summarizeStudy(rows){
 const summary=group=>({n:group.length,...Object.fromEntries(['genius','pro','highSchoolPro','breakout','stagnation','injury','major','active35','active40','legacy','retiredNumber'].map(k=>[k,pct(group,k)])),
  entryAge:mean(group.map(r=>r.entryAge).filter(x=>x!==null)),retirementAge:mean(group.map(r=>r.retirementAge)),
  injuryPerSeason:mean(group.map(r=>r.injuryCount/r.seasons)),
  routes:Object.fromEntries(routes.map(route=>{const rr=group.filter(r=>r.byRoute[route]);return [route,{n:rr.length,participation:+(rr.length/Math.max(1,group.length)*100).toFixed(2),
   meanGrowth:mean(rr.map(r=>r.byRoute[route].growth)),annualGrowth:mean(rr.map(r=>r.byRoute[route].growth/r.byRoute[route].years)),
   proRate:mean(rr.map(r=>Number(r.byRoute[route].pro)*100)),draftScore:mean(rr.flatMap(r=>r.byRoute[route].draft)),
   proYears:mean(rr.filter(r=>r.byRoute[route].pro).map(r=>r.byRoute[route].proYears)),majorRate:mean(rr.map(r=>Number(r.byRoute[route].major)*100))}];})),
  patterns:Object.fromEntries(Object.keys(group[0]?.patterns||{}).map(k=>[k,group.filter(r=>r.patterns[k]).length]))});
 return {all:summary(rows),genius:summary(rows.filter(r=>r.genius)),nonGenius:summary(rows.filter(r=>!r.genius))};
}
if(process.argv[1]?.endsWith('development-study.mjs')){
 const mode=process.argv[2]||'after',count=Number(process.argv[3]||1000),rows=[];
 for(let i=0;i<count;i++){
  const index=mode==='diversity'?i+1:Math.floor(i/5)+1,seed=Math.imul(index,2654435761)>>>0,role=index%2?'batter':'pitcher',route=routes[i%5];
  rows.push(studyRow(auditCareer(seed,role,route,null,{shouldRetire:studyRetirement}),seed,role,route));
  if((i+1)%100===0)console.log(mode+': '+(i+1)+'/'+count);
 }
 const baseline=AUDIT_CASES.map(c=>({...c,...studyRow(auditCareer(c.seed,c.role,c.route),c.seed,c.role,c.route)}));
 const report={policy:(mode==='diversity'?'1000 distinct seeds; evenly assigned five requested routes. ':'200 paired seeds × five requested routes. ')+'Retire on injury advice age32+, low-performance staff offer age33+, retirement advice age35+, amateur retry until age30-33. Existing offers only. active35/40 = domestic/major games at that age. Route statistics include repeat spells and return-to-pro; not randomized treatment effects. Productive seasons include personal awards so relief/defense specialists are not classified as failures merely by generic performance.',summary:summarizeStudy(rows),baseline,rows};
 fs.mkdirSync('reports',{recursive:true});
 fs.writeFileSync('reports/development-'+mode+'.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report.summary));
}
