import {breakoutAvailable} from './events.js';
import {developmentTrait} from './development.js';
import {DECLINE,STAGNATION} from './balance.js';
import {recordDevelopmentEvent} from './development.js';
import {rollRecordTalent} from './records.js';
import {random,between,clamp} from './random.js';
export const CAREER_TYPES=[
 {id:'amateur',weight:20,talent:[.5,.8],cap:[49,65],initial:0},
 {id:'brief',weight:11,talent:[1.15,1.45],cap:[70,82],initial:5},
 {id:'ordinary',weight:17,talent:[1.05,1.35],cap:[72,85],initial:3},
 {id:'schoolBloom',weight:10,talent:[1,1.35],cap:[78,90],initial:1},
 {id:'universityBloom',weight:10,talent:[1.05,1.4],cap:[85,97],initial:2},
 {id:'lateBloom',weight:12,talent:[.9,1.2],cap:[86,97],initial:2},
 {id:'steadyStar',weight:12,talent:[1.35,1.65],cap:[87,96],initial:8},
 {id:'lostStar',weight:8,talent:[1.35,1.6],cap:[83,95],initial:10}
];
export const GENIUS_RATE=1/30;
export function rollCareer(s){const genius=random(s)<GENIUS_RATE;let type;if(genius)type={id:'legend',talent:[1.7,1.95],cap:[95,99],initial:14};else{let roll=random(s)*100;type=CAREER_TYPES.find(t=>(roll-=t.weight)<0)||CAREER_TYPES.at(-1);}s.player.arc=type.id;s.player.genius=genius;s.player.talent=between(s,...type.talent);for(const k in s.player.abilities){s.player.abilities[k]=clamp(s.player.abilities[k]+type.initial,5,99);s.player.potential[k]=between(s,...type.cap);}s.player.arcEvent=false;rollRecordTalent(s);}
export function arcGrowth(s){const p=s.player,pro=['pro','mlb','independent'].includes(s.stage);if(p.recordTalent)return 1.3;if(p.arc==='universityBloom')return ['university','overseas'].includes(s.stage)?2.35:s.age<19?.85:1;if(p.arc==='schoolBloom'&&s.age>=14&&s.age<=18)return 1.85;if(p.arc==='lateBloom')return pro&&s.age<28?2.7:s.age<19?.88:1.25;if(p.arc==='lostStar'&&pro&&s.proYears<3)return STAGNATION.lostStarFactor;if(p.arc==='brief'&&pro&&s.proYears>=2&&s.proYears<STAGNATION.briefEnd)return STAGNATION.briefFactor;return 1;}
export function arcEvent(s){if(s.player.arcEvent)return;if(s.player.arc!=='lostStar'&&!breakoutAvailable(s))return;const id=s.player.arc;if(id==='universityBloom'&&['university','overseas'].includes(s.stage)){const text=(s.stage==='overseas'?'海外大学':'大学')+'で才能が開花。専門的な指導と実戦経験が成長につながり始めた。';s.timeline.push({year:s.year,age:s.age,text});s.news.push(text);recordDevelopmentEvent(s,id==='lostStar'?'stagnation':'breakout');s.player.arcEvent=true;return;}if(id==='schoolBloom'&&s.age>=14||id==='lateBloom'&&['pro','mlb'].includes(s.stage)||id==='lostStar'&&['pro','mlb'].includes(s.stage)){const text=id==='schoolBloom'?'学生時代に覚醒。技術と体の成長が噛み合い始めた。':id==='lateBloom'?'プロの指導で素材が開花。大きな成長期へ。':'プロの壁に苦戦。学生時代の強みを発揮できず、フォームを模索。';s.timeline.push({year:s.year,text});s.news.push(text);recordDevelopmentEvent(s,id==='lostStar'?'stagnation':'breakout');s.player.arcEvent=true;}}

export function proAdaptation(s){if(s.player.arcShockApplied||!['pro','mlb','independent'].includes(s.stage))return;const id=s.player.arc;if(id!=='lostStar'&&!(id==='brief'&&s.proYears>=2))return;const drop=(id==='lostStar'?14:10)*(DECLINE.adaptationShockMax-(DECLINE.adaptationShockMax-DECLINE.adaptationShockMin)*developmentTrait(s,'adaptability'));for(const k in s.player.abilities)s.player.abilities[k]=Math.max(5,s.player.abilities[k]-drop);recordDevelopmentEvent(s,'adaptation-shock',{drop});s.player.arcShockApplied=true;const text=id==='lostStar'?'プロの環境に適応できず、持ち味を見失った。再起への模索が始まる。':'故障の影響で力を発揮できなくなった。若くしてキャリアの岐路に立つ。';s.news.push(text);s.timeline.push({year:s.year,text});}
