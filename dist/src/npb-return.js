import {hasEverSignedNpbContract,corporateReturnEligibility} from './contract-history.js';
import {performance,specialistValue} from './stats.js';
import {overall} from './growth.js';
import {salaryEstimate} from './contracts.js';
import {TEAMS} from './data.js';
import {clamp,random,pick} from './random.js';
export function npbReturnOffers(s){
 if(!hasEverSignedNpbContract(s)||!['independent','corporate'].includes(s.stage)||!corporateReturnEligibility(s).eligible)return [];
 const recent=s.records.filter(r=>r.stage===s.stage&&!r.partial).slice(-2),last=recent.at(-1);if(!last)return [];
 const merit=recent.reduce((n,r)=>n+performance(r.stats,s.player.role),0)/recent.length;
 const rating=overall(s),old=s.records.filter(r=>r.stage==='pro'),yearsAway=Math.max(0,s.year-(old.at(-1)?.year||s.year));
 const specialist=specialistValue(last,s.player.role),volume=s.player.role==='pitcher'?last.stats.outs/180:last.stats.ab/240;
 const history=old.some(r=>performance(r.stats,s.player.role)>=3)?.05:0;
 const rebound=last.overall>(recent[0]?.overall||rating)? .04:0;
 const chance=clamp((rating-45)*.012+Math.max(0,merit)*.035+history+specialist*.1+rebound-Math.max(0,s.age-30)*.025-yearsAway*.008-(s.health?.daysLeft||0)/900,0,.8);
 if(rating<45||volume<.3||merit<=0||random(s)>=chance)return [];
 const development=rating<60||!!s.health?.daysLeft,pricing={...s,stage:'pro',contractStatus:development?'development':'registered'};
 const salary=salaryEstimate(pricing,last,true);s.seed=pricing.seed;
 return [{id:'npb-return',team:pick(s,TEAMS),stage:'pro',role:'player',salary:Math.max(development?240:420,salary),years:1,development,returnContract:true,bonus:0,setupAllowance:0}];
}
