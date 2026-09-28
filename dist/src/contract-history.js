// Contract history, not current stage or a draft invitation, establishes prior employment.
export function hasEverSignedNpbContract(s){
 return !!s.domesticEntry||(s.teams||[]).some(t=>t.stage==='pro')||(s.records||[]).some(r=>r.stage==='pro')||(s.stage==='pro'&&s.team!=='自由契約'&&!!s.activeContract);
}
export function recognizedForeignSeasons(s){return new Set((s.records||[]).filter(r=>r.stage==='pro'&&!r.partial).map(r=>r.year)).size;}
export function formerProfessional(s){return hasEverSignedNpbContract(s)||(s.teams||[]).some(t=>t.stage==='mlb')||(s.records||[]).some(r=>r.stage==='mlb');}
export function corporateReturnEligibility(s){
 const completed=(s.records||[]).filter(r=>r.stage==='corporate'&&!r.partial&&r.year>=(s.amateurEntry?.year??s.year-(s.grade||1)+1)).length;
 return {completed,required:2,eligible:s.stage!=='corporate'||completed>=2};
}
