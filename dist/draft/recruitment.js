import {RECRUITMENT} from './config.js';
import {random,clamp} from './random.js';
import {rates} from './stats.js';
import {fitNeeds,philosophyScore} from './teams.js';

// Club-specific reading of PUBLIC evidence. Never reads rank, tier, surveys,
// latent abilities, ceiling or the career's future random stream.
export function recruitmentAssessment(c,profile,seed){
 const weights=random(`${seed}:recruitment-weights:${profile.team}`),rng=random(`${seed}:recruitment:${profile.team}:${c.id}`);
 const latest=c.history.at(-1),r=rates(latest.stats),pitch=c.role==='投手',tools=c.defenseTools||{};
 const mix=values=>{const w=values.map(()=>.7+weights.next()*.6);return values.reduce((sum,x,i)=>sum+x*w[i],0)/w.reduce((a,b)=>a+b,0);};
 const ability=pitch?mix([
  (c.velocity-119)/.4,
  ((c.pitches[0]?.strike??58)-43)/.3,
  (c.pitches[0]?.whiff??18)/.3,
  66+(3-r.era)*4+(Math.min(8,r.kbb??8)-3)*2,
  (c.pitches[1]?.whiff??18)/.3
 ]):mix([
  (c.exitVelocity-112)/.69,
  50+(r.ops-.85)*25,
  tools.range??50,tools.arm??50,tools.speed??50
 ]);
 const medical=c.medical.some(m=>m.days>=100),small=pitch?latest.stats.outs<75:latest.stats.ab<80;
 const matching=fitNeeds(c,profile.needs);
 const readiness=clamp((ability-RECRUITMENT.minimumEvidence)/(RECRUITMENT.fullEvidence-RECRUITMENT.minimumEvidence),0,1);
 const needScore=matching.reduce((n,need)=>n+(RECRUITMENT.needWeights[profile.needs.findIndex(x=>x.id===need.id)]??8)*readiness,0);
 const uncertainty=rng.normal()*RECRUITMENT.noise*(small?1.35:1);
 const medicalPenalty=medical?(profile.philosophy==='medical慎重'?9:2+weights.next()*4):0;
 const score=ability+needScore+philosophyScore(c,profile.philosophy)+uncertainty-medicalPenalty+(ability>=RECRUITMENT.standout?RECRUITMENT.standoutBonus:0);
 // Investigation can concern uncertainty or medical follow-up, not just pursuit.
 const reasons=matching.map(n=>n.label);
 if(medical)reasons.push('復帰状態の確認');
 if(small)reasons.push('実績不足の追加調査');
 if(c.age<=19&&(c.height>=187||c.trend>1))reasons.push('素材と成長推移の確認');
 if(!reasons.length)reasons.push(c.representative?'大会実績の確認':'編成候補の継続調査');
 const material=c.age<=19&&(c.height>=187||c.trend>1);
 const chance=clamp(RECRUITMENT.surveyFloor+(matching.length?RECRUITMENT.surveyNeed:0)+(medical?RECRUITMENT.surveyMedical:0)+(small?RECRUITMENT.surveySmallSample:0)+(material?RECRUITMENT.surveyMaterial:0)+(c.representative?RECRUITMENT.surveyRepresentative:0)+clamp((ability-45)/40,0,1)*RECRUITMENT.surveyAbility,RECRUITMENT.surveyFloor,RECRUITMENT.surveyCeiling);
 const survey=rng.next()<chance,interview=survey&&rng.next()<RECRUITMENT.interviewChance;
 return {id:c.id,score,ability,needs:matching.map(n=>n.id),survey,interview,reasons};
}
