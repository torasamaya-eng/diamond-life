import test from 'node:test';import assert from 'node:assert/strict';
import {CONFIG} from '../dist/draft/config.js';
import {createSession} from '../dist/draft/draft.js';
import {generateCandidates,report} from '../dist/draft/candidates.js';
import {matchesNeed,teamProfile} from '../dist/draft/teams.js';
import {saveSession,loadSession} from '../dist/draft/storage.js';
test('draft12: every request has an observed candidate for all 12 clubs across 100 pools',()=>{
 for(let seed=1;seed<=100;seed++){const s=createSession(seed);for(const club of s.clubs){assert.equal(club.needs.length,3);assert.equal(new Set(club.needs.map(n=>n.id)).size,3);for(const n of club.needs)assert.ok(s.candidates.map(report).some(c=>matchesNeed(c,n)),`${seed} ${club.team} ${n.id}`);}}
});
test('draft12: peak velocity calibration preserves abilities, game statistics and RNG',()=>{
 const old=generateCandidates(42,{...CONFIG,measurementModel:'legacy'}),fresh=generateCandidates(42);
 for(let i=0;i<fresh.length;i++){const c=fresh[i],before=old[i];assert.deepEqual(c.hidden,before.hidden);assert.equal(c.name,before.name);assert.deepEqual(c.history.map(y=>y.stats),before.history.map(y=>y.stats));if(c.role==='投手'){assert.ok(c.velocity>before.velocity);assert.equal(c.velocity,c.history.at(-1).velocity);assert.equal(c.pitches[0].velocity,c.velocity);assert.ok(c.setVelocity<=c.velocity);}}
});
test('draft12: candidate availability uses public evidence, never potential or career ceiling',()=>{
 const s=createSession(17),mutated=structuredClone(s.candidates);for(const c of mutated)c.hidden={potential:0,current:{stuff:0}};
 for(let i=0;i<12;i++)assert.deepEqual(teamProfile(17,i,s.candidates.map(report)),teamProfile(17,i,mutated.map(report)));
});
test('draft12: previous saves keep their recorded velocity, needs and outcomes on reload',()=>{
 const s=createSession(31,{...CONFIG,measurementModel:'legacy',needsModel:'legacy'});delete s.config.measurementModel;delete s.config.needsModel;let raw;const storage={setItem:(k,v)=>raw=v,getItem:()=>raw};assert.equal(saveSession(s,storage),'');assert.equal(JSON.stringify(loadSession(storage).state),JSON.stringify(s));
});
