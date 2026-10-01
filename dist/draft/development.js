import {DEVELOPMENT,CAREER_DISTRIBUTION,TEAMS} from './config.js';
import {random,clamp} from './random.js';
import {teamProfile} from './teams.js';
import {rates} from './stats.js';

export function prepareDevelopment(c,quality,model='adaptation-v1'){
 const h=c.hidden;
 const settings=model==='adaptation-v2'?CAREER_DISTRIBUTION:DEVELOPMENT;
 // Keep the old residual variation, but weaken the shared starting-quality link.
 h.potential=clamp(settings.potentialCenter+(quality-49)*settings.potentialQualityWeight+(h.potential-quality-12)*settings.potentialResidualWeight,45,97);
 h.developmentModel=model;
}

export function createDevelopment(c,pick){
 const h=c.hidden,a=h.current;
 const gap=c.role==='投手'?Math.max(0,a.stuff-a.control)*DEVELOPMENT.stuffControlGap+Math.max(0,a.stuff-a.breaking)*DEVELOPMENT.stuffBreakingGap+h.setLoss*DEVELOPMENT.setLoad:Math.max(0,a.power-a.eye)*DEVELOPMENT.powerEyeGap+Math.max(0,a.power-a.contact)*DEVELOPMENT.powerContactGap+Math.max(0,-h.leftSplit-3)*DEVELOPMENT.leftLoad;
 return {load:Math.max(0,DEVELOPMENT.adaptationThreshold-h.adaptability)*DEVELOPMENT.adaptationLoad+Math.max(0,.5-h.repair)*DEVELOPMENT.repairLoad+Math.max(0,.5-h.pressure)*DEVELOPMENT.pressureLoad*(pick.round===1?1:.6)+gap*(1-h.repair*DEVELOPMENT.gapRepair),stalled:false,experience:.75,established:0,team:TEAMS[pick.team],role:null};
}

export function developmentSeason(c,d,{seed,age,years,team,overseas,availability,previous,add}){
 const h=c.hidden,rng=random(`${seed}:adaptation:${c.id}:${age}`);
 const moved=team!==d.team;
 if(moved){d.load+=(1-h.adaptability)*DEVELOPMENT.overseasLoad*(overseas?1:.5);d.team=team;d.established=0;add(age,'ADAPTATION','新しいチームの配球・練習・起用への適応を進めた');}
 const wasStalled=d.stalled;
 if(d.stalled&&availability>0){
  const recovery=DEVELOPMENT.recoveryBase+h.repair*DEVELOPMENT.recoveryRepair+h.adaptability*DEVELOPMENT.recoveryAdaptability+(previous?.value>3?.08:0)+(moved?.12:0);
  if(rng.next()<recovery)d.stalled=false;
 }else if(age<h.peakAge&&availability>0){
  const risk=DEVELOPMENT.stallBase+(1-h.adaptability)*DEVELOPMENT.stallAdaptability+(1-h.repair)*DEVELOPMENT.stallRepair+(years<=3?(1-h.pressure)*DEVELOPMENT.stallPressure:0);
  if(rng.next()<risk)d.stalled=true;
 }
 if(!wasStalled&&d.stalled)add(age,'SLUMP','プロの配球・動作への対応が停滞。起用と技術修正を継続');
 if(wasStalled&&!d.stalled)add(age,'STAGNATION_RECOVERY','継続した動作修正と実戦で停滞を脱した');
 const oldLoad=d.load;
 d.load=Math.max(0,d.load-(DEVELOPMENT.adaptationRecovery+h.adaptability*DEVELOPMENT.adaptabilityRecovery+h.repair*DEVELOPMENT.repairRecovery)*(d.stalled?DEVELOPMENT.stalledRecovery:1)*availability);
 if(oldLoad>1&&d.load<=1)add(age,'ADAPTATION_SUCCESS','プロの環境に適応し、持ち味を実戦で発揮できるようになった');
 const growthScale=h.developmentModel==='adaptation-v2'?CAREER_DISTRIBUTION.growthScale:1;
 const adaptationForm=h.developmentModel==='adaptation-v2'?CAREER_DISTRIBUTION.adaptationForm:DEVELOPMENT.adaptationForm;
 return {growth:growthScale*(d.stalled?DEVELOPMENT.stalledGrowth:1)*(DEVELOPMENT.experienceFloor+DEVELOPMENT.experienceWeight*d.experience)*(DEVELOPMENT.learningBase+h.repair*DEVELOPMENT.learningRepair),form:-d.load*adaptationForm-(d.stalled?DEVELOPMENT.stalledForm:0),stalled:d.stalled};
}

// Retention uses demonstrated improvement and farm results, not hidden ceiling
// or draft reputation. Young prospects still lose their place if development,
// health or second-team performance stalls; this is not guaranteed employment.
export function isDevelopingProspect(c,row,{years,qualityGain}){
 const b=CAREER_DISTRIBUTION;
 if(c.hidden.developmentModel!=='adaptation-v2'||row.age>b.prospectMaxAge||years>b.prospectYears||1-row.injuryDays/210<b.prospectHealth||qualityGain<b.prospectGrowth)return false;
 return c.role==='投手'?row.farm.outs>=b.prospectPitchOuts&&rates(row.farm).era<=b.prospectERA:row.farm.ab>=b.prospectBatAB&&rates(row.farm).ops>=b.prospectOPS;
}

export function opportunityFactor(c,d,{seed,age,years,team,role,position,abilities}){
 const index=TEAMS.indexOf(team),profile=teamProfile(seed,index<0?0:index),key=c.role==='投手'?(role==='先発'?'先発':'救援'):position==='指名打者'?'一塁':position;
 const context=profile.context[key];
 if(!context)return {factor:1,competition:0};
 const rng=random(`${seed}:competition:${team}:${key}:${age}`);
 const competition=clamp(context.strength-Math.max(0,context.age+years-31)*.8+Math.min(6,years*.8)+rng.normal()*4+(index<0?7:0),35,90);
 const skill=c.role==='投手'?(abilities.stuff+abilities.control+abilities.breaking)/3:role==='守備固め'?(abilities.field+abilities.arm)/2:role==='代走'?abilities.speed:abilities.contact*.5+abilities.power*.3+abilities.eye*.2;
 const factor=clamp(DEVELOPMENT.competitionBase+(skill-competition)*DEVELOPMENT.competitionSlope-(context.depth-2)*DEVELOPMENT.depthPenalty+(d.established>=2?DEVELOPMENT.establishedBonus:0),DEVELOPMENT.competitionFloor,DEVELOPMENT.competitionCeiling);
 return {factor,competition};
}

export function finishDevelopmentSeason(c,d,row,seed,add){
 const major=c.role==='投手'?row.stats.outs/3/120:row.stats.ab/400;
 const farm=c.role==='投手'?row.farm.outs/3/100:row.farm.ab/300;
 d.experience=clamp(major+farm*.75,0,1);
 d.established=row.value>2?d.established+1:0;
 if(d.role&&d.role!==row.role&&d.stalled&&random(`${seed}:role-adaptation:${c.id}:${row.age}`).next()<.2+c.hidden.repair*.4){d.stalled=false;d.load*=.7;add(row.age,'STAGNATION_RECOVERY','役割変更をきっかけに起用と動作がかみ合い、停滞を脱した');}
 d.role=row.role;
}
