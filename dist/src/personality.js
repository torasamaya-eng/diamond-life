import {developmentRoll} from './development.js';
import {ensureDevelopmentState} from './development.js';
import {ensureThrowing} from './fielding.js';
import {rollCareer} from './archetypes.js';
import {between,pick,clamp,random} from './random.js';
export const PERSONALITIES=[
 {id:'steady',name:'努力家',description:'基礎練習を続けるのが得意。育成環境で安定して伸びる。',preferred:'balanced',variance:.35},
 {id:'competitive',name:'負けず嫌い',description:'強い仲間との競争が刺激に。出番がなくても競争で伸びる。',preferred:'physical',variance:.7},
 {id:'free',name:'自由人',description:'出場機会と自由な環境が力に。成長の波は大きい。',preferred:'mental',variance:1.25},
 {id:'analytical',name:'研究家',description:'技術練習と個別指導が得意。ミートや制球を磨きやすい。',preferred:'technique',variance:.5},
 {id:'adventurous',name:'挑戦家',description:'新しい環境や海外で伸びやすい。慣れるまで苦戦することも。',preferred:'physical',variance:.95}
];
export const personality=s=>PERSONALITIES.find(p=>p.id===s.player.personality)||PERSONALITIES[0];
export function initializeTraits(s){s.player.personality=pick(s,PERSONALITIES).id;s.player.potential={};s.player.environmentFit={};s.player.growthPhase=pick(s,['early','normal','late']);rollCareer(s);ensureThrowing(s);}
export function growthFit(s,env){const p=personality(s);const key=s.environmentId||s.stage;if(s.player.environmentFit[key]===undefined)s.player.environmentFit[key]=(.72+developmentRoll(s,'environment-fit:'+key)*.5);let fit=s.player.environmentFit[key];if(p.id==='steady'&&env.growth>1.2)fit+=.15;if(p.id==='competitive'&&env.competition>45)fit+=.23;if(p.id==='free')fit+=(env.opportunity??1)>.9?.2:-.18;if(p.id==='analytical'&&env.growth>1.2)fit+=.2;if(p.id==='adventurous'&&['overseas','mlb'].includes(s.stage))fit+=.28;return clamp(fit,.5,1.6);}
// Backfill older saves without consuming the career RNG or changing existing ratings.
export function migrateTraits(s){ensureDevelopmentState(s);ensureThrowing(s);if(!s.player.personality)s.player.personality=PERSONALITIES[(s.seed>>>0)%PERSONALITIES.length].id;s.player.environmentFit??={};s.player.growthPhase??='normal';s.player.potential??=Object.fromEntries(Object.entries(s.player.abilities).map(([k,v],i)=>[k,Math.max(v,65+((s.seed+i*17)>>>0)%30)]));for(const [i,[k,v]] of Object.entries(s.player.abilities).entries())if(s.player.potential[k]===undefined)s.player.potential[k]=Math.max(v,65+((s.seed+i*17)>>>0)%30);s.moves??=[];s.marketAttempts??={};s.market??=null;s.retirementAdvice??=null;s.lastAdviceYear??=0;if(s.pending?.type==='career'&&s.pending.draft.independentOffer===undefined)s.pending.draft.independentOffer=s.pending.draft.score>=50&&(s.seed%3!==0);return s;}
