import {developmentInjuryModifier} from './development.js';
import {CONFIG} from './data.js';
import {overall} from './growth.js';
import {simulateStats,avg,era,performance} from './stats.js';
import {random,pick,between,clamp} from './random.js';
export function calendar(year){const out=[];if(year>=CONFIG.wbc.start&&(year-CONFIG.wbc.start)%CONFIG.wbc.cycle===0)out.push('世界野球選手権');const o=CONFIG.olympics;if(year>=o.start&&(year-o.start)%o.cycle===0&&(o.baseball[year]??o.defaultEnabled))out.push('世界スポーツ大会');return out;}
export function prepareNational(s){if(!['pro','mlb'].includes(s.stage))return false;s.nationalOffers??=[];if(s.nationalOfferYear===s.year)return s.nationalOffers.length>0;s.nationalOfferYear=s.year;s.seasonImpact={year:s.year,loss:0,difficulty:0};const st=s.records.at(-1)?.stats;for(const name of calendar(s.year)){const eligiblePerformance=st&&(s.player.role==='pitcher'?st.outs>=150&&era(st)<3.6:st.ab>=200&&avg(st)>.285);const merit=performance(st,s.player.role);const selected=!s.health?.daysLeft&&s.contractStatus!=='development'&&overall(s)>=65&&eligiblePerformance&&random(s)<clamp(.10+merit*.105,.03,.94);if(selected)s.nationalOffers.push({year:s.year,name});else s.nationalHistory.push({year:s.year,name,selected:false});}return s.nationalOffers.length>0;}
export function decideNational(s,participate){const offer=s.nationalOffers?.shift();if(!offer)throw Error('代表の招集は届いていません。');const entry={...offer,selected:true,participated:participate,team:'日本代表',age:s.age,stage:s.stage};if(!participate){entry.result='辞退';s.timeline.push({year:s.year,text:offer.name+'代表を辞退し、シーズンの調整を優先'});s.nationalHistory.push(entry);return;}
 entry.result=pick(s,['優勝','準優勝','ベスト4','ベスト4','ベスト8']);entry.stats=simulateStats(s,s.player.role==='pitcher'?3:entry.result==='ベスト8'?4:7,68);
 const outcomes=[];s.seasonImpact??={year:s.year,loss:0,difficulty:0};
 if(random(s)<.13*developmentInjuryModifier(s)){s.seasonImpact.loss=Math.max(s.seasonImpact.loss,between(s,.15,.4));outcomes.push('大会中の故障で今季の出場機会が減少');}
 if(random(s)<.25){s.seasonImpact.difficulty+=6;outcomes.push('調整が遅れ、今季は本来の力を出しにくい');}
 if(random(s)<.55){const keys=s.player.role==='pitcher'?['control','breaking','strikeout']:['meet','power','eye'];const key=pick(s,keys);s.player.abilities[key]=clamp(s.player.abilities[key]+between(s,1,3),5,99);outcomes.push('海外選手との交流から新たな技術を習得');}
 s.overseasExposure=Math.min(5,(s.overseasExposure||0)+1);outcomes.push('海外球団への知名度が上昇');
 entry.effects=outcomes;s.nationalHistory.push(entry);s.timeline.push({year:s.year,text:offer.name+'出場・'+entry.result+'。'+outcomes.join('／')});s.news.push(offer.name+'：'+entry.result,...outcomes);s.participationReport={name:offer.name,result:entry.result,effects:outcomes};
}
// Kept as an import-compatible entry point; selection now happens before the season.
export function nationalSelection(s){return prepareNational(s);}
