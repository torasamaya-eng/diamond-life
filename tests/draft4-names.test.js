import test from 'node:test';import assert from 'node:assert/strict';
import {assignCandidateNames,SURNAMES,GIVEN_NAMES} from '../dist/draft/names.js';
import {createSession} from '../dist/draft/draft.js';
import {saveSession,loadSession} from '../dist/draft/storage.js';

test('draft4 names: broader combinations, no same-name players in a draft and stable seeds',()=>{
 assert.ok(SURNAMES.length>=100);assert.ok(GIVEN_NAMES.length>=80);
 const all=new Set();for(let seed=1;seed<=100;seed++){
  const a=Array.from({length:76},(_,id)=>({id})),b=structuredClone(a);assignCandidateNames(a,seed);assignCandidateNames(b,seed);
  assert.deepEqual(a,b);assert.equal(new Set(a.map(c=>c.name)).size,76);assert.equal(new Set(a.map(c=>c.name.split(' ')[1])).size,76);
  for(const c of a){all.add(c.name);const [surname,given]=c.name.split(' ');assert.ok(SURNAMES.includes(surname));assert.ok(GIVEN_NAMES.includes(given));}
 }assert.ok(all.size>4000);
});
test('draft4 names: assignment only changes the name property',()=>{
 const players=[{id:'p1',ability:76,history:[{games:20}],traits:{talent:.8}},{id:'p2',ability:54,history:[],traits:{talent:.5}}],before=structuredClone(players);
 assignCandidateNames(players,4);assert.deepEqual(players.map(({name,...rest})=>rest),before);
});
test('draft4 names: existing saved names stay intact',()=>{
 const state=createSession(42);state.candidates[0].name='旧保存 選手';let raw;
 saveSession(state,{setItem:(k,v)=>raw=v});assert.equal(loadSession({getItem:()=>raw}).state.candidates[0].name,'旧保存 選手');
});
