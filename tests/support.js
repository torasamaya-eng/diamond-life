import {advanceYear} from '../dist/src/engine.js';
import {decideNational} from '../dist/src/national.js';
import {signRenewal} from '../dist/src/contracts.js';
import {choose,chooseEmployment,continueAfterInjury} from '../dist/src/engine.js';
export function settle(s){if(s.retired)return;if(s.injuryAdvice)continueAfterInjury(s);if(s.retirementAdvice)s.retirementAdvice.answered=true;if(s.employment){const o=s.employment.options.find(o=>o.role==='player');chooseEmployment(s,o.id);}if(s.contractOffers.length)signRenewal(s,'one');if(s.pending?.type==='career'){if(s.pending.draft.type!=='指名なし')choose(s,'pro');else if(['corporate','independent'].includes(s.stage))choose(s,'stay');else choose(s,'corporate');}}

export function advanceSeason(s){if(s.injuryAdvice)continueAfterInjury(s);advanceYear(s);if(s.nationalOffers?.length){while(s.nationalOffers.length)decideNational(s,false);advanceYear(s);}}
