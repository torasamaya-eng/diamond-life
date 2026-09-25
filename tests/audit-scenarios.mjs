import {createPlayer,advanceYear,choose,chooseEmployment,continueAfterInjury,retire} from '../dist/src/engine.js';
import {decideNational} from '../dist/src/national.js';
import {signRenewal} from '../dist/src/contracts.js';
import {resolveRosterDecision} from '../dist/src/roster.js';
import {eligibility,negotiate,acceptOffer,remain} from '../dist/src/market.js';
// Explicit test policy, not a new player-facing autopilot. Never creates offers or ratings.
export function auditCareer(seed,role,route,observe=null,options={}){
 const s=createPlayer('監査 選手',role,seed);let attemptedPosting=false;
 for(let step=0;step<500&&!s.retired;step++){
  const before=observe?structuredClone(s):null;
  if(options.shouldRetire?.(s)){retire(s);observe?.(s,before);break;}
  if(s.injuryAdvice)continueAfterInjury(s);
  else if(s.rosterDecision)resolveRosterDecision(s,'accept');
  else if(s.nationalOffers?.length)decideNational(s,true);
  else if(s.employment){const o=s.employment.options.find(o=>o.role==='player');if(!o)throw Error('No playable employment');chooseEmployment(s,o.id);}
  else if(s.contractOffers.length)signRenewal(s,'one');
  else if(s.retirementAdvice&&!s.retirementAdvice.answered)s.retirementAdvice.answered=true;
  else if(s.pending){
   if(s.pending.type==='middle')choose(s,seed%2?'club':'school');
   else if(s.pending.type==='high')choose(s,'mirai');
   else if(s.stage==='high'&&['university','overseas','corporate'].includes(route))choose(s,route);
   else if(s.stage==='high'&&route==='independent'&&s.pending.draft.independentOffer)choose(s,'independent');
   else if(s.pending.draft.overseasOffer)choose(s,'mlb');
   else if(s.pending.draft.type!=='指名なし')choose(s,'pro');
   else choose(s,['corporate','independent'].includes(s.stage)?'stay':'corporate');
  }else if(!attemptedPosting&&s.stage==='pro'&&!eligibility(s,'posting')){
   attemptedPosting=true;const board=negotiate(s,'posting',true);
   if(board.offers.length)acceptOffer(s,board.offers[0].id);else remain(s);
  }else advanceYear(s);
  observe?.(s,before);
 }
 if(!s.retired)throw Error('Audit policy exceeded 500 steps');
 return s;
}
export function auditProjection(s){
 const copy=structuredClone(s);
 delete copy.careerId;
 delete copy.player.developmentTraits;
 delete copy.developmentHistory;
 delete copy.seasonEnvironments;
 return copy;
}
export const AUDIT_CASES=[7,42,99].flatMap(seed=>['batter','pitcher'].flatMap(role=>['pro','university','overseas','corporate','independent'].map(route=>({seed,role,route}))));
