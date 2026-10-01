import test from 'node:test';
import assert from 'node:assert/strict';
import {CONFIG,TEAMS} from '../dist/draft/config.js';
import {createSession,cpuBoards,cpuOrder,startDraft,firstCompetition,finishDraft} from '../dist/draft/draft.js';
import {generateCandidates,report} from '../dist/draft/candidates.js';
import {recruitmentAssessment} from '../dist/draft/recruitment.js';
import {NEEDS,teamProfile} from '../dist/draft/teams.js';
import {simulateCareer} from '../dist/draft/career.js';
import {createDevelopment,developmentSeason,opportunityFactor} from '../dist/draft/development.js';
import {saveSession,loadSession} from '../dist/draft/storage.js';

test('draft10: each survey and interview is counted from an actual distinct club investigation',()=>{
 for(const c of generateCandidates(42)){
  assert.equal(c.surveys,c.surveyDetails.length);
  assert.equal(c.interviews,c.surveyDetails.filter(x=>x.interview).length);
  assert.equal(new Set(c.surveyDetails.map(x=>x.team)).size,c.surveys);
  assert.ok(c.surveyDetails.every(x=>TEAMS.includes(x.team)&&x.reasons.length>0));
  assert.ok(!/score|ability|potential|hidden/.test(JSON.stringify(report(c).surveyDetails)));
 }
});

test('draft10: CPU ignores media rank, tier, survey count and future abilities',()=>{
 const s=createSession(52),before=cpuBoards(s.candidates,s.seed),order=cpuOrder(s,1);
 for(const c of s.candidates){c.rank=1;c.tier='1位候補';c.surveys=12;c.interviews=12;c.hidden={success:true,potential:999,current:{}};}
 assert.deepEqual(cpuBoards(s.candidates,s.seed),before);
 assert.deepEqual(cpuOrder(s,1),order);
});

test('draft10: club needs alter selection without changing candidate evidence',()=>{
 const c=generateCandidates(42).find(c=>c.category==='大学'&&c.role==='投手'),profile=teamProfile(42,1),before=JSON.stringify(c);
 const needed={...profile,needs:[{...NEEDS.college,priority:'最優先'}]},unneeded={...profile,needs:[{...NEEDS.catcherReady,priority:'最優先'}]};
 const a=recruitmentAssessment(report(c),needed,42),b=recruitmentAssessment(report(c),unneeded,42);
 assert.ok(a.score>b.score);assert.equal(a.ability,b.ability);assert.equal(JSON.stringify(c),before);
});

test('draft10: a strong nonmatching candidate can override a weak matching candidate',()=>{
 const original=generateCandidates(52).find(c=>c.role==='投手'),weak=structuredClone(original),strong=structuredClone(original);
 weak.category='大学';strong.category='高校';
 weak.velocity=130;weak.pitches=weak.pitches.map(p=>({...p,whiff:9,strike:45}));
 strong.velocity=158;strong.pitches=strong.pitches.map(p=>({...p,whiff:32,strike:74}));
 const profile={...teamProfile(52,0),needs:[{...NEEDS.college,priority:'最優先'}]};
 assert.ok(recruitmentAssessment(report(strong),profile,52).score>recruitmentAssessment(report(weak),profile,52).score);
});

test('draft10: popular inquiries are not identical to media ranking and can include medical follow-up',()=>{
 const pool=generateCandidates(42),ordered=pool.toSorted((a,b)=>a.rank-b.rank);
 assert.ok(ordered.some((c,i)=>i>0&&c.surveys>ordered[i-1].surveys));
 assert.ok(pool.some(c=>c.surveyDetails.some(x=>x.reasons.includes('復帰状態の確認'))));
});

test('draft10: new model is deterministic and does not mutate amateur history or ceiling during play',()=>{
 const a=finishDraft(createSession(52)),b=finishDraft(createSession(52));assert.deepEqual(a,b);
 const pick=a.picks[0],c=a.candidates.find(c=>c.id===pick.id),before=JSON.stringify(c);
 assert.deepEqual(simulateCareer(c,pick,a.seed),simulateCareer(b.candidates.find(c=>c.id===pick.id),b.picks[0],b.seed));
 assert.equal(JSON.stringify(c),before);
});

test('draft10: old-save model is preserved, with no invented investigations or adaptation trace',()=>{
 const config={...CONFIG};delete config.scoutingModel;delete config.careerModel;
 const s=finishDraft(createSession(7,config));let data;saveSession(s,{setItem:(k,v)=>data=v});
 const loaded=loadSession({getItem:()=>data}).state;assert.deepEqual(loaded,s);
 assert.ok(loaded.candidates.every(c=>!c.surveyDetails&&!c.hidden.developmentModel));
 const p=s.picks[0],c=s.candidates.find(c=>c.id===p.id),old=simulateCareer(c,p,s.seed);
 assert.ok(old.rows.every(y=>!y.development));assert.deepEqual(old,simulateCareer(loaded.candidates.find(c=>c.id===p.id),loaded.picks[0],loaded.seed));
});

test('draft10: persistent stagnation reduces growth, recovery remains possible and absence blocks recovery progress',()=>{
 const c=generateCandidates(1)[0],pick={team:0,round:1},d=createDevelopment(c,pick),events=[];
 c.hidden.repair=0;c.hidden.adaptability=0;d.stalled=true;
 const load=d.load,adjustment=developmentSeason(c,d,{seed:3,age:23,years:2,team:TEAMS[0],overseas:false,availability:0,previous:null,add:(...e)=>events.push(e)});
 assert.equal(d.load,load);if(d.stalled)assert.ok(adjustment.growth<.25);
 c.hidden.repair=1;c.hidden.adaptability=1;let recovered=false;
 for(let age=24;age<40;age++){developmentSeason(c,d,{seed:3,age,years:age-21,team:TEAMS[0],overseas:false,availability:1,previous:{value:4},add:(...e)=>events.push(e)});if(!d.stalled)recovered=true;}
 assert.ok(recovered);assert.ok(events.some(e=>e[1]==='STAGNATION_RECOVERY'));
});

test('draft10: same athlete gets different opportunities in different club depth charts',()=>{
 const c=generateCandidates(52).find(c=>c.role==='野手'),a=c.hidden.current,d=createDevelopment(c,{team:0,round:1});
 const factors=TEAMS.map(team=>opportunityFactor(c,d,{seed:52,age:c.age+1,years:1,team,role:'レギュラー',position:c.position,abilities:a}).factor);
 assert.ok(Math.max(...factors)-Math.min(...factors)>.15);
});

test('draft10: adaptation and repair influence performance without guaranteeing either outcome',()=>{
 const original=generateCandidates(52).find(c=>c.role==='投手'),good=structuredClone(original),bad=structuredClone(original),pick={team:0,round:1,development:false};
 good.hidden.adaptability=good.hidden.repair=good.hidden.pressure=1;bad.hidden.adaptability=bad.hidden.repair=bad.hidden.pressure=0;
 let goodValue=0,badValue=0;
 for(let seed=1;seed<=20;seed++){goodValue+=simulateCareer(good,pick,seed,null,{honors:false}).value;badValue+=simulateCareer(bad,pick,seed,null,{honors:false}).value;}
 assert.ok(goodValue>badValue*1.25,`${goodValue} / ${badValue}`);
});

test('draft10: new population naturally has popular failures, lower-tier stars and development successes',()=>{
 let popularFailure=0,lowerStar=0,developmentStar=0;
 for(let seed=1;seed<=60;seed++){
  const s=createSession(seed);startDraft(s);
  const interests=new Map(s.candidates.map(c=>[c.id,firstCompetition(s,c.id).filter(t=>t!==s.playerTeam).length]));finishDraft(s);
  for(const p of s.picks){const c=s.candidates.find(c=>c.id===p.id),r=simulateCareer(c,p,seed,null,{honors:false});
   popularFailure+=Number(interests.get(c.id)>=3&&r.evaluation.rank<3);
   lowerStar+=Number(c.rank>28&&r.evaluation.rank>=4);
   developmentStar+=Number(p.development&&r.evaluation.rank>=4);
  }
 }
 assert.ok(popularFailure>0);assert.ok(lowerStar>0);assert.ok(developmentStar>0);
});
