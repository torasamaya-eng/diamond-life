import {DEVELOPMENT_CONFIG,DECLINE,ROUTE_GROWTH} from './balance.js';
import {prepareDevelopmentGrowth,developmentGrowthModifier,developmentHealthFactor,developmentTrait} from './development.js';
import {arcGrowth,arcEvent,proAdaptation} from './archetypes.js';
import {STYLES,PITCH_STYLES} from './profile.js';
import {BAT_KEYS,PITCH_KEYS} from './data.js';
import {clamp,between} from './random.js';
import {growthFit} from './personality.js';
import {CAREER_BALANCE} from './balance.js';
export const overall=s=>Math.round((s.player.role==='pitcher'?PITCH_KEYS:BAT_KEYS).reduce((n,k)=>n+s.player.abilities[k],0)/(s.player.role==='pitcher'?PITCH_KEYS.length:BAT_KEYS.length));
export const velocity=s=>Math.round(65+s.player.abilities.velocity*.96);
// Phase controls shape; the existing peakAge locates its time axis. Continuous across age boundaries.
export function ageGrowthBase(s){
 const age=s.age,c=DECLINE,end=s.player.peakAge+c.grace;
 if(age<=12)return (.65+(age-6)/6*.45)*c.youthScale;
 if(age<18)return 1.1*c.youthScale+(age-12)/6*(c.adultBase-1.1*c.youthScale);
 if(age<=end)return c.adultBase*Math.pow(clamp((end-age)/(end-18),0,1),c.ageExponent);
 const elapsed=age-end;
 return -(c.slope*elapsed+c.acceleration*elapsed*elapsed);
}
export function growthVariance(s){return DECLINE.varianceMax-(DECLINE.varianceMax-DECLINE.varianceMin)*developmentTrait(s,'consistency');}
export function declineMultiplier(s,key){
 const wear=1+(1-developmentTrait(s,'longevity'))*CAREER_BALANCE.declineLongevity+(1-developmentTrait(s,'injuryResistance'))*CAREER_BALANCE.declineHealth+(s.injuries||[]).filter(i=>i.severe).length*CAREER_BALANCE.declineSevere;
 return developmentTrait(s,'declineRate')*(1+(.5-developmentTrait(s,'longevity'))*DECLINE.longevityWeight)*(DECLINE.ability[key]||1)*wear;
}
export function grow(s,env,wholeYear=false){
 prepareDevelopmentGrowth(s,env);proAdaptation(s);arcEvent(s);
 const age=s.age,variance=growthVariance(s),fitRoll=between(s,.8,1.2),changed={};
 const fit=clamp(1+(growthFit(s,env)-1)*ROUTE_GROWTH.fitWeight,ROUTE_GROWTH.fitMin,ROUTE_GROWTH.fitMax)*(1+(fitRoll-1)*variance);
 const base=ageGrowthBase(s),c=DECLINE;
 const timing=s.player.growthPhase==='early'?(age<c.phaseBoundary?c.phaseEarlyYoung:c.phaseEarlyAdult):s.player.growthPhase==='late'?(age<c.phaseBoundary?c.phaseLateYoung:c.phaseLateAdult):1;
 const phase=between(s,1-variance*.35,1+variance*.35);
 const experience=clamp((overall(s)-(env.competition||30))/100+.9,.55,1.2);
 const healthFactor=developmentHealthFactor(s);
 for(const k of Object.keys(s.player.abilities)){
  const before=s.player.abilities[k],ceiling=Math.max(before,s.player.potential[k]),growthDice=k==='throwing'?{seed:(s.seed^0x713ac)>>>0}:s;
  const focusRoll=between(growthDice,.75,1.3),focus=1+(focusRoll-1)*variance;
  const style=s.player.role==='pitcher'?(PITCH_STYLES[s.player.pitchStyle]||PITCH_STYLES.power):(STYLES[s.player.style]||STYLES.balanced);
  const affinity=style.boost.length?(style.boost.includes(k)?1.42:.86):1,plateau=clamp((ceiling-before)/22,.04,1);
  let gain=base>0?base*s.player.talent*env.growth*fit*timing*phase*experience*focus*affinity*plateau:base*declineMultiplier(s,k);
  gain=gain*(base>0?arcGrowth(s):1)*(wholeYear?DEVELOPMENT_CONFIG.wholeYearScale:1)+between(growthDice,-.35,.35)*variance*(base>0?1:c.noiseScale);
  if(base>0&&env.boost?.includes(k))gain+=DEVELOPMENT_CONFIG.schoolBoost*plateau;
  if(base>0&&s.stage==='overseas'&&['power','velocity'].includes(k))gain+=DEVELOPMENT_CONFIG.overseasBoost*plateau;
  if(gain>0)gain*=developmentGrowthModifier(s,env,k)*healthFactor;
  s.player.abilities[k]=clamp(before+gain,5,ceiling);changed[k]=s.player.abilities[k]-before;
 }
 s.lastGrowth={fit:Math.round(fit*100),phase:s.developmentState.stagnation?'伸び悩み':phase<.85?'伸び悩み':phase>1.15?'好調':'安定',personality:'',healthFactor,variance,base,peakAge:s.player.peakAge};
 return changed;
}
