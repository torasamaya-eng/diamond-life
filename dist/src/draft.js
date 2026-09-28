import {hasEverSignedNpbContract,formerProfessional} from './contract-history.js';
import {rookieContractTerms,SALARY_MODEL,overseasRookieTerms} from './contracts.js';
import {MLB_TEAMS} from './market.js';
import {TEAMS} from './data.js';
import {overall} from './growth.js';
import {avg,era,performance} from './stats.js';
import {clamp,between,pick,random} from './random.js';
// NPB/JABA: draft at the end of the second (college) or third (school) registered season.
// Independent leagues are a separate route and have no JABA waiting period.
export function corporateDraftEligibility(s){
 if(hasEverSignedNpbContract(s))return {eligible:false,required:0,completed:0,returning:true};
 if(s.stage!=='corporate')return {eligible:true,required:0,completed:0};
 const college=(s.records||[]).some(r=>['university','overseas'].includes(r.stage)&&r.grade===4)||(s.teams||[]).some(t=>['university','overseas'].includes(t.stage));
 const required=college||formerProfessional(s)?2:3,completed=Math.max(1,s.grade||1);
 return {eligible:completed>=required,required,completed};
}
export function draft(s){if(!corporateDraftEligibility(s).eligible)throw Error('社会人のドラフト対象年度に達していません。');const last=s.records.at(-1);const stats=last?.stats;const production=stats?clamp(performance(stats,s.player.role)*2.5,-10,15):0;const koshienBonus=Math.min(8,s.tournaments.filter(t=>t.koshien&&t.year>=s.year-2).reduce((n,t)=>n+(t.result==='優勝'?4:2),0));const score=clamp(overall(s)*.8+s.scout*.16+production*.65+koshienBonus+(s.player.arc==='lateBloom'&&overall(s)>=45?12:0)+between(s,-13,11),0,100);let type=score>=70?'支配下':score>=59?'育成':'指名なし';if(random(s)<(score>=85?.06:score>=70?.18:.35))type='指名なし';const independentOffer=overall(s)>=43&&random(s)<clamp((overall(s)-32)/65,.12,.8);const rank=type==='支配下'?clamp(Math.ceil((96-score)/8),1,6):type==='育成'?Math.ceil(between(s,1,4)):null;const result={year:s.year,age:s.age,stage:s.stage,score:Math.round(score),type,rank,independentOffer,team:type==='指名なし'?null:pick(s,TEAMS)};Object.assign(result,rookieContractTerms(result,s.player.role));if(s.stage==='overseas'&&overall(s)>=64&&random(s)<clamp((score-45)/65,.05,.8)){result.overseasOffer={team:pick(s,MLB_TEAMS),...overseasRookieTerms(score,Math.max(1,Math.ceil((100-score)/7)))};s.news.push('海外プロ球団からもドラフト指名：'+result.overseasOffer.team);}s.drafts.push(result);s.timeline.push({year:s.year,text:type==='指名なし'?'ドラフト：指名なし':`${result.team}から${type==='育成'?'育成':''}${rank}位指名`});return result;}
