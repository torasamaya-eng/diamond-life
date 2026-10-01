import fs from 'node:fs';
import assert from 'node:assert/strict';

const count=Number(process.argv[2]||1000);
const reference=JSON.parse(fs.readFileSync('tests/fixtures/draft-history-reference.json','utf8'));
const before=JSON.parse(fs.readFileSync(`reports/draft11-before-${count}.json`,'utf8'));
const after=JSON.parse(fs.readFileSync(`reports/draft11-after-${count}.json`,'utf8'));
const star=p=>['スター','スーパースター','レジェンド'].includes(p.classification);
const key=p=>p.development?'育成':p.rank<4?String(p.rank):'4+';
const wilson=(success,n)=>{
 const z=1.96,p=success/n,d=1+z*z/n,center=(p+z*z/(2*n))/d,margin=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;
 return [Math.max(0,center-margin),Math.min(1,center+margin)];
};
const rows=['1','2','3','4+','育成'].map(round=>{
 const cohort=reference.players.filter(p=>key(p)===round),known=cohort.filter(p=>!p.error),stars=known.filter(star).length,legends=known.filter(p=>p.classification==='レジェンド').length;
 const gameKey=round==='4+'?'4':round;
 const rate=g=>({n:g.n,starPlus:(g.star+g.superstar+g.legend)/g.n,legend:g.legend/g.n});
 return {round,total:cohort.length,known:known.length,missing:cohort.length-known.length,recentCareers:known.filter(p=>p.recentCareer).length,stars,legends,observedStarRate:stars/known.length,observedLegendRate:legends/known.length,starConfidence95:wilson(stars,known.length),legendConfidence95:wilson(legends,known.length),missingDataStarBounds:[stars/cohort.length,(stars+cohort.length-known.length)/cohort.length],before:rate(before.rounds[gameKey]),after:rate(after.rounds[gameKey])};
});
// Per-round weighting uses the historical cohort, not the game's compressed
// round mix; pooled raw overall rates have different denominators and differ.
const distance=model=>rows.reduce((n,r)=>n+r.known*Math.abs(r[model].starPlus-r.observedStarRate),0)/rows.reduce((n,r)=>n+r.known,0);
const out={count,method:reference.comparison,rows,weightedAbsoluteStarRateError:{before:distance('before'),after:distance('after')},allCandidateTiers:after.tiers,missing:reference.players.filter(p=>p.error),recent:reference.players.filter(p=>p.recentCareer).map(p=>({name:p.name,classification:p.classification})),invariants:after.invariants};
assert.ok(out.weightedAbsoluteStarRateError.after<out.weightedAbsoluteStarRateError.before);
assert.ok(rows.every(r=>r.after.starPlus>=r.starConfidence95[0]&&r.after.starPlus<=r.starConfidence95[1]));
assert.ok(rows.every(r=>r.after.legend>=r.legendConfidence95[0]&&r.after.legend<=r.legendConfidence95[1]));
fs.writeFileSync(`reports/draft11-reference-comparison-${count}.json`,JSON.stringify(out,null,2));
console.log(JSON.stringify({rows,weightedAbsoluteStarRateError:out.weightedAbsoluteStarRateError},null,2));
