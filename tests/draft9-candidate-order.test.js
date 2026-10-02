import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,finishDraft,available} from '../dist/draft/draft.js';
import {TIERS} from '../dist/draft/config.js';
import {report} from '../dist/draft/candidates.js';
import {candidateNumbers,orderCandidates} from '../dist/draft/candidate-order.js';

test('draft9: tiers are grouped in requested order without ranking within each tier',()=>{
 const s=createSession(42),before=JSON.stringify(s),numbers=candidateNumbers(s);
 const ordered=orderCandidates(s,s.candidates.map(report));
 assert.equal(ordered.length,76);
 assert.deepEqual(ordered.map(c=>TIERS.indexOf(c.tier)),ordered.map(c=>TIERS.indexOf(c.tier)).sort((a,b)=>a-b));
 for(const tier of TIERS){const group=ordered.filter(c=>c.tier===tier);assert.notDeepEqual(group.map(c=>c.rank),group.map(c=>c.rank).sort((a,b)=>a-b));}
 assert.deepEqual(ordered.map(c=>numbers.get(c.id)),Array.from({length:76},(_,i)=>i+1));
 assert.notDeepEqual(ordered.slice(0,22).map(c=>c.rank),Array.from({length:22},(_,i)=>i+1));
 for(const c of ordered)assert.deepEqual(c,report(s.candidates.find(p=>p.id===c.id)));
 assert.equal(JSON.stringify(s),before);
});

test('draft9: same seed and legacy save reproduce numbers without adding save fields',()=>{
 const s=createSession(902),copy=JSON.parse(JSON.stringify(s));
 assert.deepEqual([...candidateNumbers(s)],[...candidateNumbers(copy)]);
 copy.candidates.reverse();
 assert.deepEqual([...candidateNumbers(s)],[...candidateNumbers(copy)]);
 assert.equal('candidateNumbers' in copy,false);
});

test('draft9: ratings, hidden data and internal ordering within a group do not determine numbers',()=>{
 const s=createSession(18),changed=structuredClone(s);
 for(const group of TIERS.map(t=>changed.candidates.filter(c=>c.tier===t))){
  const ranks=group.map(c=>c.rank).reverse();
  group.forEach((c,i)=>{c.rank=ranks[i];c.velocity=200;c.exitVelocity=250;c.hidden={potential:1};});
 }
 changed.candidates.reverse();
 assert.deepEqual([...candidateNumbers(s)],[...candidateNumbers(changed)]);
});

test('draft9: filters and picks keep original numbers; reading the directory cannot affect draft outcomes',()=>{
 const s=createSession(37),untouched=structuredClone(s),numbers=new Map(candidateNumbers(s));
 const pitchers=orderCandidates(s,s.candidates.filter(c=>c.role==='投手'));
 assert.deepEqual(pitchers.map(c=>numbers.get(c.id)),pitchers.map(c=>numbers.get(c.id)).sort((a,b)=>a-b));
 finishDraft(s);finishDraft(untouched);
 assert.deepEqual(s,untouched);
 assert.deepEqual([...candidateNumbers(s)],[...numbers]);
 for(const c of orderCandidates(s,available(s)))assert.equal(candidateNumbers(s).get(c.id),numbers.get(c.id));
});

test('draft9: across 1000 seeds each tier first slot is distributed among its candidates',()=>{
 const base=createSession(42);for(const tier of TIERS){const group=base.candidates.filter(c=>c.tier===tier),counts=new Map(group.map(c=>[c.id,0]));
 for(let seed=0;seed<1000;seed++){
  const s={...base,seed};
  const id=orderCandidates(s,group)[0].id;counts.set(id,counts.get(id)+1);
 }
 assert.ok([...counts.values()].every(n=>n>=25&&n<=140),JSON.stringify([...counts]));
 assert.equal([...counts.values()].reduce((a,b)=>a+b,0),1000);}
});
