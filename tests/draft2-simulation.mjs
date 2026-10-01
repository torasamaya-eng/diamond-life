import fs from 'node:fs';
import {rates} from '../dist/draft/stats.js';
import {fitNeeds} from '../dist/draft/teams.js';
const before=process.argv.includes('--before'),root=before?'../reports/draft2-before/':'../dist/draft/';
const {createSession,finishDraft}=await import(root+'draft.js'),{simulateCareer}=await import(root+'career.js');
const yAb=c=>c.history.at(-1).stats.ab;
const count=Number(process.env.DRAFT_SIM_COUNT||1000),metrics={},teams={},phenomena={},careers={},contradictions=[];
function collect(label,c){const y=c.history.at(-1),r=rates(y.stats),g=metrics[label]??={pitcher:{},batter:{}};const values=c.role==='投手'?{ERA:r.era,IP:y.stats.outs/3,K:y.stats.so,BB:y.stats.bba,velocity:c.velocity}:{AVG:r.avg,OBP:r.obp,SLG:r.slg,HR:y.stats.hr,SB:y.stats.sb,defense:c.defenseTools?.range??c.hidden.current.field,arm:c.defenseTools?.arm??c.hidden.current.arm,speed:c.defenseTools?.speed??c.hidden.current.speed};for(const [k,v]of Object.entries(values))(g[c.role==='投手'?'pitcher':'batter'][k]??=[]).push(v);}
function found(k,ok,c,seed){if(ok){const x=phenomena[k]??={count:0,example:{seed,id:c.id,name:c.name,category:c.category,tier:c.tier}};x.count++;}}
for(let seed=1;seed<=count;seed++){
 const s=finishDraft(createSession(seed,undefined,before?0:seed%12));
 if(s.picks.length!==60)throw Error('Incomplete draft');
 for(const c of s.candidates){const p=s.picks.find(p=>p.id===c.id),label=p?p.development?'育成':p.round+'位':'指名漏れ';collect(label,c);collect('公開'+c.tier,c);const r=rates(c.history.at(-1).stats),t=c.defenseTools||{};
  found('育成候補に高打率',c.tier==='育成候補'&&c.role==='野手'&&yAb(c)>=80&&r.avg>=.34,c,seed);found('下位大学実績',c.category==='大学'&&c.rank>40&&r.avg>=.32,c,seed);found('1位素材',p?.round===1&&c.category==='高校'&&(c.role==='投手'?r.era>=3.5&&c.velocity>=148:r.avg<.28&&(c.contact.throw>=130||c.exitVelocity>=160)),c,seed);
  found('守備特化',t.range>=75&&(c.hidden.current.contact??100)<52,c,seed);found('肩特化',t.arm>=80&&(c.hidden.current.contact??100)<55,c,seed);found('俊足一芸',t.speed>=83&&(t.range??100)<60&&(c.hidden.current.contact??100)<60,c,seed);found('強打守備難',c.role==='野手'&&c.exitVelocity>=165&&t.catching<48,c,seed);
  if(!p||before)continue;
  const club=s.clubs[p.team],g=teams[club.team]??={drafts:0,picks:0,matches:0,cpuPicks:0,cpuMatches:0,needs:{},needPicks:{}};if(p.round===1){g.drafts++;for(const n of club.needs)g.needs[n.id]=(g.needs[n.id]||0)+1;}g.picks++;const fits=fitNeeds(c,club.needs);if(fits.length)g.matches++;if(p.team!==s.playerTeam){g.cpuPicks++;if(fits.length)g.cpuMatches++;}for(const n of fits)g.needPicks[n.id]=(g.needPicks[n.id]||0)+1;
  const result=simulateCareer(c,p,seed,club.needs),e=result.evaluation,key=e.absolute;careers[key]=(careers[key]||0)+1;
  found('努力家でも非定着',c.hidden.personality.workEthic>.75&&e.rank===0,c,seed);found('人物懸念でもスター',c.personality.some(x=>x.tone==='concern')&&e.rank>=4,c,seed);
  if(c.role==='野手'&&['救援の仕事人','守護神','セットアッパー','エース','ローテーション投手'].includes(e.absolute))contradictions.push('wrong-role');if(e.needReview.includes('狙いに担当')&&!fits.length)contradictions.push('false-need');
  if(e.facts.doubleDigit>=2&&e.rank<3)contradictions.push('double-digit');if(result.total.games===0&&e.rank>=2)contradictions.push('farm-only');if(e.absolute==='守備職人'&&e.facts.defenseYears<4)contradictions.push('defense');if(result.rows.some(y=>y.contract==='育成'&&y.stats.games))contradictions.push('development');
  for(const y of result.rows){const d=y.defense;if(d&&(d.errors>d.chances||d.caught>d.attempts||d.putouts+d.assists+d.errors!==d.chances))contradictions.push('fielding');if(y.injuryDays>=210&&y.stats.games+y.farm.games)contradictions.push('injury');}
 }
 if(seed%100===0)console.log(`${before?'before':'after'} ${seed}/${count}`);
}
for(const group of Object.values(metrics))for(const set of Object.values(group))for(const [k,values]of Object.entries(set)){values.sort((a,b)=>a-b);set[k]={n:values.length,mean:values.reduce((s,x)=>s+x,0)/values.length,min:values[0],p05:values[Math.floor(values.length*.05)],median:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)],max:values.at(-1)};}
for(const t of Object.values(teams))t.matchRate=t.matches/t.picks,t.cpuMatchRate=t.cpuMatches/t.cpuPicks;
const result={drafts:count,candidates:count*76,careers:before?0:count*60,metrics,teams,phenomena,careerClassification:careers,contradictions};fs.writeFileSync(`reports/draft2-${before?'before':'after'}-simulation.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({drafts:count,phenomena,contradictions:contradictions.length},null,2));if(contradictions.length)process.exitCode=1;
