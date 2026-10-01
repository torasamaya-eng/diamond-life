import test from 'node:test';
import assert from 'node:assert/strict';
import {isRecordedAward,revealCareers} from '../dist/draft/career.js';
import {createSession,finishDraft,startDraft,chooseFirst} from '../dist/draft/draft.js';
import {random} from '../dist/draft/random.js';
import {assignCandidateNames} from '../dist/draft/names.js';

test('draft5: approximate honors are excluded while recorded titles remain',()=>{
 const legacy=['ゴールデングラブ相当','本塁打王','ベストナイン相当','MVP','オールスター'];
 assert.deepEqual(legacy.filter(isRecordedAward),['本塁打王','MVP','オールスター']);
});
test('draft5: new careers never grant approximate honors and awards reconcile',()=>{
 const results=revealCareers(finishDraft(createSession(52)));
 for(const r of results){assert.ok(r.titles.every(t=>isRecordedAward(t.title)));
  assert.deepEqual(r.titles,r.rows.flatMap(y=>y.awards.map(title=>({year:y.year,age:y.age,title}))));
  assert.deepEqual(r.events.filter(e=>e.type==='AWARD').map(e=>e.text),r.titles.map(t=>t.title));
 }
});
test('draft5: expanded candidate pools reuse given names only after exhausting the pool',()=>{
 const candidates=Array.from({length:180},(_,id)=>({id}));assignCandidateNames(candidates,5);
 assert.equal(new Set(candidates.map(c=>c.name)).size,180);
 assert.equal(new Set(candidates.slice(0,100).map(c=>c.name.split(' ')[1])).size,100);
});
test('draft5: competing teams are equally weighted and lottery seeds reproduce results',()=>{
 const teams=Array.from({length:12},(_,i)=>i),counts=teams.map(()=>0);
 for(let seed=1;seed<=12000;seed++)counts[random(`${seed}:lottery:0`).pick(teams)]++;
 for(const n of counts)assert.ok(n>850&&n<1150,JSON.stringify(counts));
 for(let seed=1;seed<=12;seed++){
  const a=createSession(seed),id=a.candidates[0].id;startDraft(a);a.declarations.fill(id);
  const b=structuredClone(a);chooseFirst(a,id);chooseFirst(b,id);
  const ballot=a.lotteries[0][0];assert.equal(ballot.teams.length,12);
  assert.equal(ballot.winner,random(`${seed}:lottery:0`).pick(teams));
  assert.deepEqual(a.lotteries,b.lotteries);
 }
});
