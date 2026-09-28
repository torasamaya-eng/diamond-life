import {studyRetirement} from './development-study.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';
import {auditCareer} from './audit-scenarios.mjs';
import {moneyIssues} from './money-invariants.mjs';
import {inspectDevelopmentState} from '../dist/src/dev-tools.js';
import {writeAutosave,readAutosave} from '../dist/src/autosave.js';
import {createCareerArchiveSnapshot,expandCareerState} from '../dist/src/archive.js';
import {validate} from '../dist/src/storage.js';
import {mlbPayStage} from '../dist/src/mlb-contracts.js';
const count=Number(process.env.RELEASE_CAREERS||1000);if(count<1000)throw Error('Release requires at least 1000 careers');
let maxAutoBytes=0,maxArchiveBytes=0;
const routes=['pro','university','overseas','corporate','independent'],rows=[],issues=[],salaries={pro:[],mlb:[],independent:[]},stages={},transitions={},returns={independent:0,corporate:0,mlb:0};
const invariants=Object.fromEntries(['signingDuplicate','setupDuplicate','postingPlayerIncome','NaN','Infinity','negativeMoney','contractTotalMismatch','paidSalaryMismatch','formerNpbRedraft'].map(k=>[k,0]));
for(let i=0;i<count;i++){
 const seed=Math.imul(i+1,2654435761)>>>0,route=routes[i%5],role=i%2?'pitcher':'batter';let npbEntry=false,everLeft=false,lastContract='',seen=new Set(),lastTeam='',contractCount=0;
 const s=auditCareer(seed,role,route,state=>{
  const fingerprint=JSON.stringify(state.activeContract);if(fingerprint!==lastContract){lastContract=fingerprint;contractCount++;if(state.stage==='mlb'){const key=mlbPayStage(state);stages[key]=(stages[key]||0)+1;}}
  if(state.stage==='pro')npbEntry=true;else if(npbEntry)everLeft=true;
  if(lastTeam&&lastTeam!==state.stage)transitions[lastTeam+'→'+state.stage]=(transitions[lastTeam+'→'+state.stage]||0)+1;lastTeam=state.stage;
  if(state.pending?.draft&&!state.pending.draft.returning&&npbEntry&&state.stage!=='pro'){invariants.formerNpbRedraft++;issues.push({seed,step:'former NPB draft'});}
  // Count each distinct failure once per career; include transient contract state, not just retirement.
  for(const issue of moneyIssues(state)){const key=JSON.stringify(issue);if(!seen.has(key)){seen.add(key);invariants[issue.type]=(invariants[issue.type]||0)+1;issues.push({seed,...issue});}}
 },{snapshot:false,shouldRetire:studyRetirement});
 const integrity=inspectDevelopmentState(s);if(integrity.length)issues.push({seed,integrity});
 const memory=new Map();writeAutosave(s,{setItem:(k,v)=>memory.set(k,v)});maxAutoBytes=Math.max(maxAutoBytes,Buffer.byteLength([...memory.values()][0]));const loaded=readAutosave({getItem:k=>memory.get(k)??null});assert.equal(loaded.error,'',String(seed));assert.equal(loaded.state.seed,s.seed);assert.equal(loaded.state.careerId,s.careerId);
 assert.deepEqual(loaded.state.records,s.records);const archiveJson=JSON.stringify(createCareerArchiveSnapshot(s));maxArchiveBytes=Math.max(maxArchiveBytes,Buffer.byteLength(archiveJson));const archive=expandCareerState(JSON.parse(archiveJson));validate(archive);assert.deepEqual(archive.records,s.records);assert.deepEqual(archive.afterlife,s.afterlife);
 for(let j=1;j<s.teams.length;j++){const t=s.teams[j],prior=s.teams[j-1];if(t.stage==='pro'&&prior.stage!=='pro'&&s.teams.slice(0,j).some(x=>x.stage==='pro')&&prior.stage in returns)returns[prior.stage]++;}
 for(const r of s.records)if(salaries[r.stage])salaries[r.stage].push(r.salary||0);
 rows.push({seed,role,route,retirementAge:s.age,age40:s.records.some(r=>['pro','mlb'].includes(r.stage)&&r.age>=40),pro:s.records.some(r=>r.stage==='pro'||r.stage==='mlb'),major:s.records.some(r=>r.stage==='mlb'&&r.stats.games>0),genius:s.player.genius,retiredNumber:s.honors.some(h=>h.title==='永久欠番'),legacy:s.honors.some(h=>h.title==='名球会入り'),years:s.records.length,contracts:contractCount,returned:everLeft&&s.teams.some((t,j)=>t.stage==='pro'&&s.teams.slice(0,j).some(x=>x.stage==='independent'||x.stage==='corporate')),salary:s.totalSalary,bonus:s.totalSigningBonus,setup:s.totalSetupAllowance,postFee:s.postingFees?.reduce((n,p)=>n+p.amount,0)||0,awards:s.awards.length});
 if((i+1)%100===0)console.log((i+1)+'/'+count+' careers; invariant failures '+issues.length);
}
const dist=values=>{const a=values.sort((a,b)=>a-b);return {n:a.length,mean:a.reduce((n,v)=>n+v,0)/(a.length||1),median:a[Math.floor(a.length*.5)]||0,p95:a[Math.floor(a.length*.95)]||0,max:a.at(-1)||0};};
const report={count,maxAutoBytes,maxArchiveBytes,policy:'existing studyRetirement, seed multiplicative 2654435761',retiredNumber:rows.filter(r=>r.retiredNumber).length,legacy:rows.filter(r=>r.legacy).length,pro:rows.filter(r=>r.pro).length,major:rows.filter(r=>r.major).length,age40:rows.filter(r=>r.age40).length,genius:rows.filter(r=>r.genius).length,meanRetirement:rows.reduce((n,r)=>n+r.retirementAge,0)/count,invariants,issues,transitions,returns,contractStages:stages,salaries:Object.fromEntries(Object.entries(salaries).map(([k,v])=>[k,dist(v)])),rows};
fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/release-simulation.json',JSON.stringify(report,null,2));assert.equal(issues.length,0,JSON.stringify(issues.slice(0,12)));console.log(JSON.stringify({...report,rows:undefined},null,2));
