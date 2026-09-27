import fs from 'node:fs';import {auditCareer} from './audit-scenarios.mjs';import {studyRetirement} from './development-study.mjs';
const result={count:1000,contradictoryOffers:0,maxRookieAnnual:0,maxSigningBonus:0,rookieCount:0,overseasCorporateDrafts:0,overseasIndependentDrafts:0,corporateTooEarly:0,farmOnly:0,minorOnly:0,injuries:{elementary:{},middle:{},high:{},adultPro:{}}};
for(let i=0;i<result.count;i++){
 const seed=Math.imul(i+1,2654435761)>>>0,group=i%5,route=['overseas','overseas','university','corporate','pro'][group];let lastDraft=0,lastInjury=0,lastRecord=0,lastEntry='';
 auditCareer(seed,i%2?'pitcher':'batter',route,s=>{
  if(s.contractOffers.some(o=>o.id==='one')&&s.contractOffers.some(o=>o.id==='rehab'))result.contradictoryOffers++;
  for(const d of s.drafts.slice(lastDraft)){if(d.rank){result.maxSigningBonus=Math.max(result.maxSigningBonus,d.bonus||0);if(['corporate','independent'].includes(d.stage)&&s.teams.some(t=>t.stage==='overseas'))result[d.stage==='corporate'?'overseasCorporateDrafts':'overseasIndependentDrafts']++;}if(d.stage==='corporate'){const r=s.records.find(r=>r.year===d.year&&r.stage==='corporate');const required=s.teams.some(t=>['university','overseas'].includes(t.stage))?2:3;if(r?.grade<required)result.corporateTooEarly++;}}
  lastDraft=s.drafts.length;
  if(s.stage==='pro'&&s.activeContract?.type==='新人契約'&&lastEntry!==s.activeContract.startYear+':'+s.team){lastEntry=s.activeContract.startYear+':'+s.team;result.rookieCount++;result.maxRookieAnnual=Math.max(result.maxRookieAnnual,s.activeContract.annual);if(s.activeContract.annual>1600)throw Error('rookie salary overflow '+seed);}
  for(const injury of s.injuries.slice(lastInjury)){const category=['elementary','middle','high'].includes(injury.stage)?injury.stage:['pro','mlb'].includes(injury.stage)?'adultPro':null;if(category){const bucket=result.injuries[category];bucket[injury.name]=(bucket[injury.name]||0)+1;}}lastInjury=s.injuries.length;
  for(const r of s.records.slice(lastRecord))if(!r.stats.games&&r.levels?.second?.games>0){if(r.stage==='pro')result.farmOnly++;if(r.stage==='mlb')result.minorOnly++;}lastRecord=s.records.length;
 },{snapshot:false,shouldRetire:studyRetirement,careerRoute:s=>s.stage==='overseas'?(group===0?'corporate':group===1&&s.pending.draft.independentOffer?'independent':null):null});
 if((i+1)%100===0)console.log('completed '+(i+1));
}
fs.writeFileSync('reports/mobile-playtest-1000.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
