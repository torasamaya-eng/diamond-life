import {CONFIG,BAT_KEYS,PITCH_KEYS} from './data.js';
import {random,clamp} from './random.js';
import {CAREER_BALANCE} from './balance.js';
import {DEVELOPMENT_CONFIG,DEVELOPMENT_TRAITS,ROUTE_GROWTH,BREAKOUT,STAGNATION,DECLINE,INJURY_GROWTH_PENALTY} from './balance.js';
// Existing talent/potential/growthPhase/arc/peakAge and abilities.clutch remain authoritative.
export const DEVELOPMENT_TRAIT_DEFAULTS=Object.freeze({declineRate:1,injuryResistance:.5,adaptability:.5,consistency:.5,hiddenBreakout:.5,stagnationRisk:.5,longevity:.5,pressureResistance:.5});
export function developmentHash(value){let hash=2166136261;for(const ch of String(value)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
const unitRoll=(seed,key)=>random({seed:developmentHash(seed+':'+key)});
export function ensureDevelopmentState(s){
 const p=s.player,c=DEVELOPMENT_TRAITS;p.developmentTraits??={};
 if(typeof p.developmentTraits!=='object'||Array.isArray(p.developmentTraits))throw Error('成長特性の形式が不正です。');
 const t=p.developmentTraits;
 for(const key of ['innateTalent','growthPotential','developmentTiming','peakAge','clutch'])if(t[key]===null)delete t[key];
 s.developmentState??={version:c.version,originSeed:developmentHash(JSON.stringify([s.seed,p.arc,p.growthPhase,p.role,p.abilities]))};
 const d=s.developmentState;
 if(d.version!==c.version||!Number.isInteger(d.originSeed)||d.originSeed<0||d.originSeed>4294967295)throw Error('成長データの形式が不正です。');
 const draw=key=>clamp(c.min+unitRoll(d.originSeed,key)*c.spread,c.min,c.max);
 const adaptation=t.adaptability??draw('adaptability');
 const longevity=t.longevity??clamp(draw('longevity')+(p.growthPhase==='late'?c.longevityPhase:p.growthPhase==='early'?-c.longevityPhase:0),c.min,c.max);
 const generated={adaptability:adaptation,longevity,
  declineRate:clamp(c.declineMin+unitRoll(d.originSeed,'declineRate')*(c.declineMax-c.declineMin)-(longevity-.5)*c.declineLongevity,c.declineMin,c.declineMax),
  injuryResistance:draw('injuryResistance'),consistency:clamp(draw('consistency')+(adaptation-.5)*c.consistencyAdaptation,c.min,c.max),
  hiddenBreakout:draw('hiddenBreakout'),stagnationRisk:draw('stagnationRisk'),pressureResistance:draw('pressureResistance')};
 for(const key of Object.keys(DEVELOPMENT_TRAIT_DEFAULTS)){
  if(t[key]===null||t[key]===undefined)t[key]=generated[key];
  if(!Number.isFinite(t[key])||t[key]<0||t[key]>(key==='declineRate'?2:1))throw Error('成長特性の数値が不正です。');
 }
 s.developmentHistory??=[];s.seasonEnvironments??={};
 if(!Array.isArray(s.developmentHistory)||typeof s.seasonEnvironments!=='object'||Array.isArray(s.seasonEnvironments))throw Error('成長履歴・年度環境の形式が不正です。');
 return s;
}
const developmentRoleKey=s=>s.player.role==='pitcher'?s.player.pitchRole:s.player.batterRole;
const developmentEnvironmentKey=s=>[s.stage,s.environmentId||'',s.team].join(':');
export function initializeDevelopment(s){
 ensureDevelopmentState(s);const d=s.developmentState;if(d.newPlayerInitialized)return;
 s.player.peakAge=clamp(s.player.peakAge+(DEVELOPMENT_TRAITS.peakShift[s.player.growthPhase]||0),DEVELOPMENT_TRAITS.peakMin,DEVELOPMENT_TRAITS.peakMax);
 d.newPlayerInitialized=true;d.environmentKey=developmentEnvironmentKey(s);d.roleKey=developmentRoleKey(s);
}
export function developmentRoll(s,key){ensureDevelopmentState(s);return unitRoll(s.developmentState.originSeed,[s.year,s.period,s.stage,key].join(':'));}
export const developmentTime=s=>s.year+s.period/3;
export function developmentContext(s){return {age:s.age,year:s.year,grade:s.grade,stage:s.stage,environmentId:s.environmentId,careerYear:s.year-CONFIG.startYear+1,proYears:s.proYears,overseasSeasons:new Set(s.records.filter(r=>r.stage==='mlb'&&!r.partial).map(r=>r.year)).size,traits:s.player.developmentTraits||DEVELOPMENT_TRAIT_DEFAULTS};}
export const seasonEnvironment=(s,year=s.year)=>s.seasonEnvironments?.[year]||{leagues:{}};
export function beginDevelopmentSeason(s){ensureDevelopmentState(s);s.seasonEnvironments[s.year]??={leagues:{}};}
export function recordDevelopmentEvent(s,kind,details={}){
 ensureDevelopmentState(s);
 const type=({breakout:'BREAKOUT',stagnation:'STAGNATION','adaptation-shock':'ADAPTATION_FAILURE'})[kind]||kind;
 s.developmentHistory.push({kind,type,year:s.year,age:s.age,stage:s.stage,team:s.team,arc:s.player.arc,reason:details.reason||kind,...details});
}
export const developmentTrait=(s,key)=>s.player.developmentTraits?.[key]??DEVELOPMENT_TRAIT_DEFAULTS[key];
export function developmentPressure(s,env){
 const cfg=ROUTE_GROWTH[s.stage]||{},c=ROUTE_GROWTH,draft=s.drafts?.findLast(d=>d.team===s.team&&d.type!=='指名なし');
 const elite=s.stage==='high'&&env.competition>=c.eliteCompetition,top=draft?.rank<=c.topDraft&&s.grade<=c.rookieYears;
 const rookie=['pro','mlb'].includes(s.stage)&&s.grade<=c.rookieYears,abroad=['overseas','mlb'].includes(s.stage);
 return elite||top||rookie||abroad||(s.scout||0)>=c.highScout?cfg.pressure||0:0;
}
export function startDevelopmentAdaptation(s,reason,strength){
 const t=s.player.developmentTraits,c=ROUTE_GROWTH,d=s.developmentState;
 const failed=developmentRoll(s,'adapt:'+reason)<clamp(c.adaptationFailureBase+(.5-t.adaptability)*c.adaptationFailureTrait,c.adaptationFailureMin,c.adaptationFailureMax);
 d.adaptation={start:developmentTime(s),end:developmentTime(s)+c.adaptationYears+(failed?c.failureExtension:0),failed,strength,reason};
 recordDevelopmentEvent(s,failed?'ADAPTATION_FAILURE':'ADAPTATION_SUCCESS',{reason});
 if(d.stagnation&&d.environmentKey!==developmentEnvironmentKey(s)&&!failed&&developmentRoll(s,'adaptation-recovery')<t.adaptability*CAREER_BALANCE.recoveryAdaptation+t.pressureResistance*CAREER_BALANCE.recoveryPressure)d.stagnation.end=Math.min(d.stagnation.end,developmentTime(s)+c.recoveryAfter);
}
export function prepareDevelopmentGrowth(s,env){
 ensureDevelopmentState(s);const d=s.developmentState,t=s.player.developmentTraits,time=developmentTime(s),key=developmentEnvironmentKey(s);
 const stamp=[s.year,s.period,key].join(':');if(d.review===stamp)return;d.review=stamp;
 if(d.environmentKey!==key){if(d.environmentKey!==undefined)startDevelopmentAdaptation(s,'進路・所属変更',ROUTE_GROWTH[s.stage]?.adaptation||0);d.environmentKey=key;}
 const role=developmentRoleKey(s);
 if(d.roleKey!==undefined&&d.roleKey!==role&&d.stagnation&&developmentRoll(s,'role-recovery')<ROUTE_GROWTH.roleRecoveryChance)d.stagnation.end=time;
 d.roleKey=role;
 if(d.stagnation&&time>=d.stagnation.end){recordDevelopmentEvent(s,'STAGNATION_END',{reason:'時間経過・環境変化による回復'});d.stagnation=null;}
 if(s.age>=s.player.peakAge+DECLINE.grace&&!d.declineStarted){d.declineStarted=true;recordDevelopmentEvent(s,'DECLINE_START',{reason:'個人のピーク付近を過ぎ、能力の維持期へ'});}
 const recent=s.developmentHistory.filter(h=>(h.type||h.kind)==='STAGNATION');
 if(s.age>=STAGNATION.minAge&&s.age<s.player.peakAge&&!d.stagnation&&d.stagnationReviewYear!==s.year){
  d.stagnationReviewYear=s.year;
  const compound=t.stagnationRisk*(1-t.adaptability)*(1-t.pressureResistance);
  const last=recent.at(-1),chance=STAGNATION.baseChance+t.stagnationRisk*STAGNATION.traitChance+(d.adaptation?.failed&&time<d.adaptation.end?STAGNATION.adaptationBonus:0)+(developmentPressure(s,env)>0?STAGNATION.highPressureBonus:0)+Math.max(0,compound-CAREER_BALANCE.compoundRiskFloor)*CAREER_BALANCE.compoundRiskChance;
  if(recent.length<STAGNATION.maxEvents&&(!last||s.year-last.year>=STAGNATION.cooldown)&&developmentRoll(s,'stagnation')<chance){
   d.stagnation={start:time,end:time+STAGNATION.duration+compound*CAREER_BALANCE.compoundDuration,multiplier:(STAGNATION.maxMultiplier-(STAGNATION.maxMultiplier-STAGNATION.minMultiplier)*t.stagnationRisk)*(1-compound)*(1-compound)};
   recordDevelopmentEvent(s,'STAGNATION',{reason:d.adaptation?.failed?'新環境に慣れず成長が停滞':'成長の足踏み。時間や環境変化で回復可能'});
  }
 }
}
export function observeDevelopmentRoster(s,roster){
 ensureDevelopmentState(s);const d=s.developmentState,cfg=ROUTE_GROWTH[s.stage]||{},upper=s.stage==='mlb'?'major':'first',lower=s.stage==='mlb'?'minor':'second';
 const next=roster.counts.active>=roster.counts.farm?upper:lower;
 if(d.level!==undefined&&d.level!==next)startDevelopmentAdaptation(s,next===upper?'一軍・メジャーへの昇格':'二軍・マイナーでの再調整',cfg.adaptation||0);
 d.level=next;
}
export function developmentOpportunity(s,env){
 const previous=s.periodResults?.findLast(r=>r.stage===s.stage&&r.team===s.team);
 if(!previous)return clamp(env.opportunity??1,.3,1);
 const c=ROUTE_GROWTH,first=previous.levels?.first?.games??previous.stats.games,second=previous.levels?.second?.games||0;
 const factor=s.player.role==='pitcher'?(s.player.pitchRole==='starter'?c.starterOpportunity:c.reliefOpportunity):1;
 return clamp((first+second*c.farmExperience)/Math.max(1,(env.games||143)*factor),0,1);
}
export function developmentGrowthModifier(s,env,ability){
 const t=s.player.developmentTraits,d=s.developmentState,c=ROUTE_GROWTH,cfg=c[s.stage]||{},keys=s.player.role==='pitcher'?PITCH_KEYS:BAT_KEYS;
 const room=keys.reduce((n,k)=>n+Math.max(0,s.player.potential[k]-s.player.abilities[k]),0)/keys.length/c.potentialRoom,practice=developmentOpportunity(s,env);
 let modifier=1+(t.adaptability-.5)*(cfg.adaptation||0);
 modifier*=c.opportunityFloor+c.opportunityWeight*practice;
 modifier*=1+(cfg.unfinished||0)*clamp(room,0,1)+(s.player.growthPhase==='late'?cfg.late||0:0);
 modifier*=1+(cfg.practice||0)*(practice-.5);
 if(s.stage==='corporate')modifier*=1+(t.consistency-.5)*cfg.consistency+(['meet','eye','field','throwing','control','breaking'].includes(ability)?cfg.technique:0);
 if(s.stage==='pro'&&s.teams.find(x=>x.stage==='pro')?.from==='high'&&s.grade<=c.rookieYears){
  const mean=keys.reduce((n,k)=>n+s.player.abilities[k],0)/keys.length;modifier*=clamp(mean/c.rookieCompetition,c.rookieFloor,c.rookieCeiling);
 }
 modifier*=1+(t.pressureResistance-.5)*developmentPressure(s,env);
 const time=developmentTime(s),adapt=d.adaptation;
 if(adapt&&time<adapt.end){
  const progress=clamp((adapt.end-time)/(adapt.end-adapt.start),0,1);
  modifier*=1+(adapt.failed?-c.failurePenalty*(1-t.adaptability):c.successBoost*t.adaptability)*progress*Math.min(1,adapt.strength/c.mlb.adaptation);
 }
 if(d.stagnation&&time<d.stagnation.end)modifier*=d.stagnation.multiplier;
 if(d.breakoutUntil>time)modifier*=BREAKOUT.windowBoost;
 return modifier*DEVELOPMENT_CONFIG.modifiers.growth;
}
export function developmentInjuryModifier(s){const c=DEVELOPMENT_TRAITS;return (c.injuryMax-(c.injuryMax-c.injuryMin)*developmentTrait(s,'injuryResistance'))*DEVELOPMENT_CONFIG.modifiers.injuryRisk;}
export function injuryGrowthFactor(loss){
 const c=INJURY_GROWTH_PENALTY,points=[[0,1],[c.shortShare,c.shortFactor],[c.mediumShare,c.mediumFactor],[c.longShare,c.longFactor],[1,c.fullFactor]],x=clamp(loss,0,1);
 for(let i=1;i<points.length;i++)if(x<=points[i][0]){const [a,av]=points[i-1],[b,bv]=points[i];return av+(bv-av)*(x-a)/(b-a);}
 return c.fullFactor;
}
export function developmentHealthFactor(s,issue=null){
 const days=['pro','mlb','independent'].includes(s.stage)?365:122,loss=issue?issue.lost:Math.min(1,(s.health?.daysLeft||0)/days);
 const national=s.seasonImpact?.year===s.year?s.seasonImpact.loss||0:0;
 return injuryGrowthFactor(1-(1-loss)*(1-national));
}
export function applyNewInjuryGrowth(s,changes,issue){
 const before=s.lastGrowth?.healthFactor??1,after=developmentHealthFactor(s,issue);if(after>=before)return;
 for(const key of Object.keys(changes))if(changes[key]>0){const reduction=changes[key]*(1-after/before);s.player.abilities[key]=Math.max(5,s.player.abilities[key]-reduction);changes[key]-=reduction;}
 s.lastGrowth.healthFactor=after;
}
export const developmentOpportunityModifier=s=>DEVELOPMENT_CONFIG.modifiers.opportunity;
export const developmentSalaryModifier=(s,record,market)=>DEVELOPMENT_CONFIG.modifiers.salary;

// Overseas affiliation alone is not a top-league debut. Selection uses completed
// professional/minor seasons, not college stats or a new success/failure lottery.
export function majorReady(s){
 const c=CAREER_BALANCE,keys=s.player.role==='pitcher'?PITCH_KEYS:BAT_KEYS;
 const rating=keys.reduce((n,k)=>n+s.player.abilities[k],0)/keys.length;
 const good=st=>st&&(s.player.role==='pitcher'?st.outs>=c.pitchingSample&&st.er*27/st.outs<=c.evidenceERA:st.ab>=c.battingSample&&st.hits/st.ab>=c.evidenceAverage);
 const recent=s.records.filter(r=>r.year>=s.year-3&&!r.partial);
 let evidence=0;
 if(recent.some(r=>r.stage==='pro'&&good(r.stats)))evidence=c.domesticEvidence;
 if(recent.some(r=>r.stage==='mlb'&&good(r.stats)))evidence=Math.max(evidence,c.majorEvidence);
 if(recent.some(r=>r.stage==='mlb'&&good(r.levels?.second)))evidence=Math.max(evidence,c.minorEvidence);
 return rating+(developmentTrait(s,'adaptability')-.5)*c.majorAdaptation+evidence-Math.max(0,s.age-c.majorAgingStart)*c.majorAging>=c.majorThreshold;
}
