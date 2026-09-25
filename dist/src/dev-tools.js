import {DEVELOPMENT_TRAIT_DEFAULTS} from './development.js';
import {DEV_MODE} from './balance.js';
import {ABILITIES,CONFIG,STAGES} from './data.js';
// Read-only diagnostics, usable from Node without UI, localStorage, ads or RNG calls.
export function inspectDevelopmentState(s,previous=null){
 const issues=[];
 const issue=(code,path)=>issues.push({code,path});
 if(!s||typeof s!=='object')return [{code:'invalid-state',path:'state'}];
 if(!Number.isInteger(s.age)||s.age<0)issue('invalid-age','age');
 if(!Number.isInteger(s.year)||s.year-CONFIG.startYear!==s.age-CONFIG.startAge)issue('age-year-mismatch','year');
 if(!STAGES[s.stage])issue('invalid-stage','stage');
 if(typeof s.careerId!=='string'||!/^DL-[A-Z0-9-]{6,80}$/.test(s.careerId))issue('invalid-career-id','careerId');
 if(previous&&s.careerId!==previous.careerId)issue('career-id-changed','careerId');
 if(previous?.retired&&(s.year!==previous.year||s.age!==previous.age||s.period!==previous.period||(s.records?.length||0)!==(previous.records?.length||0)))issue('retired-progression','year');
 if(!Number.isFinite(s.player?.peakAge)||s.player.peakAge<18||s.player.peakAge>50)issue('invalid-peak-age','player.peakAge');
 for(const key of Object.keys(DEVELOPMENT_TRAIT_DEFAULTS)){const value=s.player?.developmentTraits?.[key];if(!Number.isFinite(value)||value<0||value>(key==='declineRate'?2:1))issue('invalid-development-trait','player.developmentTraits.'+key);}
 for(const key of Object.keys(ABILITIES)){
  const a=s.player?.abilities?.[key],cap=s.player?.potential?.[key];
  if(!Number.isFinite(a)||a<0||a>99)issue('invalid-ability','player.abilities.'+key);
  if(!Number.isFinite(cap)||cap<5||cap>99)issue('invalid-potential','player.potential.'+key);
 }
 if(['elementary','middle','high','university','overseas','corporate'].includes(s.stage)&&s.salary!==0)issue('amateur-salary','salary');
 for(const [i,r] of (s.records||[]).entries()){
  const path='records.'+i;
  if(!STAGES[r.stage])issue('invalid-record-stage',path+'.stage');
  if(r.dailyRoster&&r.dailyRoster.stage!==r.stage)issue('roster-stage-mismatch',path+'.dailyRoster');
  if(r.levels&&r.stats&&r.levels.first&&['games','ab','hits','outs'].some(k=>r.stats[k]!==r.levels.first[k]))issue('first-team-totals-mismatch',path+'.stats');
  if(r.dailyRoster?.days?.some(d=>r.stage==='pro'&&['major','minor','minorInjured','il10','il15','il60'].includes(d.status)||r.stage==='mlb'&&['first','second','injured'].includes(d.status)))issue('cross-league-roster',path+'.dailyRoster.days');
 }
 return issues;
}
export function developmentCheck(s,previous=null){return DEV_MODE?inspectDevelopmentState(s,previous):[];}
