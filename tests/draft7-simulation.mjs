import fs from 'node:fs';import assert from 'node:assert/strict';
import {createSession,finishDraft} from '../dist/draft/draft.js';import {careerCompetition} from '../dist/draft/career.js';import {rates} from '../dist/draft/stats.js';import {leagueOf} from '../dist/draft/honors.js';import {HONORS} from '../dist/draft/config.js';
const count=Number(process.argv[2]||100),out={drafts:count,careers:0,annualRows:0,titleCounts:{},firstRoundVerdicts:{},invariants:{unqualifiedBattingTitle:0,unqualifiedPitchingTitle:0,duplicateMVP:0,wrongTotalSalary:0,nonFinite:0},elapsedMs:0};const started=Date.now();
for(let seed=1;seed<=count;seed++){
 const pool=careerCompetition(finishDraft(createSession(seed))),mvp=new Map();
 for(const r of pool){out.careers++;if(r.pick.round===1&&!r.pick.development)out.firstRoundVerdicts[r.verdict]=(out.firstRoundVerdicts[r.verdict]||0)+1;if(r.totalSalary!==r.rows.reduce((n,y)=>n+y.salary,0))out.invariants.wrongTotalSalary++;
  for(const y of r.rows){out.annualRows++;if(!Number.isFinite(y.salary)||!Number.isFinite(rates(y.stats).ops))out.invariants.nonFinite++;
   for(const award of y.awards){out.titleCounts[award]=(out.titleCounts[award]||0)+1;if(award==='首位打者'&&y.stats.ab+y.stats.bb+y.stats.hbp+y.stats.sf<Math.round(HONORS.games*HONORS.plateAppearancesPerGame))out.invariants.unqualifiedBattingTitle++;if(award==='最優秀防御率'&&y.stats.outs<HONORS.games*3)out.invariants.unqualifiedPitchingTitle++;if(award==='MVP'){const key=y.year+':'+leagueOf(y);mvp.set(key,(mvp.get(key)||0)+1);}}
  }
 }out.invariants.duplicateMVP+=[...mvp.values()].filter(n=>n>1).length;if(seed%20===0)console.log(`${seed}/${count} drafts`);
}out.elapsedMs=Date.now()-started;fs.writeFileSync('reports/draft7-simulation.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));assert.ok(Object.values(out.invariants).every(n=>n===0));
