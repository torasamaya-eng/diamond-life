import fs from 'node:fs';
import assert from 'node:assert/strict';

const count=Number(process.argv[2]||1000),model=process.argv[3]||'after';
const seedStart=Number(process.argv[4]||1);
const base=model==='trial'?'../reports/draft11-trial/':'../dist/draft/';
const {CONFIG}=await import(`${base}config.js`);
const {createSession,finishDraft}=await import(`${base}draft.js`);
const {simulateCareer}=await import(`${base}career.js`);
const {sum}=await import(`${base}stats.js`);
const init=()=>({n:0,drafted:0,star:0,superstar:0,legend:0,starClass:0,regular:0,years:0});
const out={model,count,seedStart,candidates:0,careers:0,tiers:{},rounds:{},classification:{},invariants:{wrongStats:0,wrongSalary:0,invalid:0},examples:{}};
const add=(g,r)=>{g.drafted++;g.star+=Number(r.classification==='スター');g.superstar+=Number(r.classification==='スーパースター');g.legend+=Number(r.classification==='レジェンド');g.starClass+=Number(r.evaluation.rank>=4);g.regular+=Number(r.evaluation.rank>=3);g.years+=r.years;};
for(let seed=seedStart;seed<seedStart+count;seed++){
 const config=model==='before'?{...CONFIG,careerModel:'adaptation-v1'}:CONFIG;
 const s=finishDraft(createSession(seed,config)),picks=new Map(s.picks.map(p=>[p.id,p]));assert.equal(picks.size,60);
 for(const c of s.candidates){
  out.candidates++;const g=out.tiers[c.tier]??=init();g.n++;
  const p=picks.get(c.id);if(!p)continue;
  const r=simulateCareer(c,p,seed,null,{honors:false});out.careers++;add(g,r);
  const round=out.rounds[p.development?'育成':String(p.round)]??=init();round.n++;add(round,r);
  out.classification[r.classification]=(out.classification[r.classification]||0)+1;
  if(r.evaluation.rank>=4&&c.rank>28)out.examples[c.tier]??={seed,id:c.id,name:c.name,round:p.round,development:p.development,classification:r.classification};
  if(JSON.stringify(r.total)!==JSON.stringify(sum(r.rows.map(y=>y.stats))))out.invariants.wrongStats++;
  if(r.totalSalary!==r.rows.reduce((n,y)=>n+y.salary,0))out.invariants.wrongSalary++;
  for(const y of r.rows)if(Object.values(y.stats).some(n=>!Number.isFinite(n)||n<0)||y.stats.hits>y.stats.ab)out.invariants.invalid++;
 }
 if((seed-seedStart+1)%200===0)console.log(`${model} ${seed-seedStart+1}/${count} (seed ${seed})`);
}
assert.ok(Object.values(out.invariants).every(n=>n===0));
fs.writeFileSync(`reports/draft11-${model}-${count}${seedStart===1?'':`-seed${seedStart}`}.json`,JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
