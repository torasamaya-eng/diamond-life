import {INJURY_CONFIG} from './balance.js';
import {developmentInjuryModifier} from './development.js';
import {random,pick,integer,clamp} from './random.js';
export const INJURIES=[{name:'打撲',min:7,max:14},{name:'足首の捻挫',min:14,max:42},{name:'肉離れ',min:45,max:100},{name:'疲労骨折',min:90,max:180},{name:'膝の靱帯損傷',min:370,max:540,severe:true},{name:'肘靱帯損傷・手術',min:400,max:600,severe:true}];
// Game weights, not clinical incidence estimates. Adult probability and adult pools are unchanged.
export const YOUTH_INJURIES={
 elementary:[{name:'打撲',min:7,max:14,weight:40},{name:'軽い足首の捻挫',min:10,max:28,weight:28},{name:'成長期のオーバーユース',min:21,max:60,weight:20},{name:'少年野球肘（投球による痛み）',min:30,max:90,weight:11},{name:'成長期の疲労骨折',min:60,max:120,weight:1},{name:'成長板の損傷・長期療養',min:150,max:300,severe:true,weight:1}],
 middle:[{name:'打撲',min:7,max:14,weight:25},{name:'足首の捻挫',min:14,max:42,weight:25},{name:'成長期のオーバーユース',min:30,max:80,weight:20},{name:'投球による肘・肩の障害',min:45,max:120,weight:25},{name:'疲労骨折',min:90,max:180,weight:5},{name:'成長板の損傷・長期療養',min:180,max:365,severe:true,weight:1}],
 high:[...INJURIES.map(x=>({...x,weight:x.severe?1:20})),{name:'成長期の肘・肩の障害',min:30,max:100,weight:20}]
};
export const YOUTH_SEVERE_SCALE={elementary:.1,middle:.25,high:.6};
export function injuryProfile(s){
 const group=s.stage==='elementary'||s.age<=12?'elementary':s.stage==='middle'||s.age<=15?'middle':s.stage==='high'||s.age<=18?'high':'adult';
 return {group,pool:YOUTH_INJURIES[group]||INJURIES,severeScale:YOUTH_SEVERE_SCALE[group]??1};
}
function selectInjury(s,profile,severe){
 const pool=profile.pool.filter(x=>!!x.severe===severe);
 if(profile.group==='adult')return pick(s,pool);
 let draw=random(s)*pool.reduce((n,x)=>n+x.weight,0);
 for(const spec of pool){draw-=spec.weight;if(draw<0)return spec;}return pool.at(-1);
}
export function injuryProbability(s){return (INJURY_CONFIG.baseRisk+Math.max(0,s.age-INJURY_CONFIG.agingStart)*INJURY_CONFIG.agingRisk)*developmentInjuryModifier(s);}
export function injury(s){s.injuries??=[];const days=['pro','mlb','independent'].includes(s.stage)?365:122;let current=s.health?.daysLeft>0?s.health:null;let startDay=0;if(!current&&random(s)<injuryProbability(s)){const profile=injuryProfile(s),severe=random(s)<INJURY_CONFIG.severeRisk*profile.severeScale;const spec=selectInjury(s,profile,severe);current={year:s.year,age:s.age,stage:s.stage,name:spec.name,totalDays:integer(s,spec.min,spec.max),severe,daysLeft:0};current.daysLeft=current.totalDays;if(severe){const keys=s.player.role==='pitcher'?['velocity','control','stamina']:['speed','field','power'];current.decline=integer(s,6,18);for(const k of keys)s.player.abilities[k]=clamp(s.player.abilities[k]-current.decline,5,99);if(random(s)<INJURY_CONFIG.retirementAdviceRisk)s.injuryRetirement=true;}if(['pro','mlb'].includes(s.stage))startDay=integer(s,0,150);s.health=current;s.injuries.push(current);s.timeline.push({year:s.year,text:current.name+'。復帰まで約'+current.totalDays+'日'+(severe?'。大きな能力低下を伴う':'')});}if(!current)return null;const unavailableDays=current.daysLeft;const lost=Math.min(1,current.daysLeft/days);current.daysLeft=Math.max(0,current.daysLeft-(days-startDay));return {...current,lost,startDay,unavailableDays};}
