import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,startDraft,chooseFirst,finishDraft} from '../dist/draft/draft.js';
import {lostCandidates,watchedCandidates,revealWatched} from '../dist/draft/watchlist.js';
import {revealCareers,simulateCareer,careerCompetition} from '../dist/draft/career.js';
import {saveSession,loadSession} from '../dist/draft/storage.js';

function lostBallot(){for(let seed=1;seed<=12;seed++){
 const s=createSession(seed),id=s.candidates[0].id;startDraft(s);s.declarations.fill(id);chooseFirst(s,id);
 if(lostCandidates(s).some(c=>c.id===id)){finishDraft(s);return {s,id};}
}throw Error('No losing ballot fixture');}

test('draft6: a genuine lost lottery needs no favorite registration and retains the winning team',()=>{
 const {s,id}=lostBallot(),p=s.picks.find(p=>p.id===id);assert.notEqual(p.team,s.playerTeam);
 assert.equal(s.favorites.length,0);assert.ok(lostCandidates(s).some(c=>c.id===id));
 assert.ok(watchedCandidates(s).some(c=>c.id===id));assert.throws(()=>revealWatched(s,id));
 revealCareers(s);const before=JSON.stringify(s.results),r=revealWatched(s,id);
 assert.deepEqual(r,simulateCareer(s.candidates.find(c=>c.id===id),p,s.seed,s.clubs[p.team].needs,{peers:careerCompetition(s)}));
 assert.equal(r.pick.team,p.team);assert.equal(JSON.stringify(s.results),before);
 let raw;saveSession(s,{setItem:(k,v)=>raw=v});const loaded=loadSession({getItem:()=>raw}).state;
 assert.deepEqual(lostCandidates(loaded).map(c=>c.id),lostCandidates(s).map(c=>c.id));
 assert.deepEqual(revealWatched(loaded,id),r);
});
test('draft6: repeated lost ballot records do not duplicate entries and winning ballots are excluded',()=>{
 const {s,id}=lostBallot(),ballot=s.lotteries.flat().find(b=>b.id===id&&b.teams.includes(s.playerTeam));
 s.lotteries.push([structuredClone(ballot)]);assert.equal(lostCandidates(s).filter(c=>c.id===id).length,1);
 const own=s.picks.find(p=>p.team===s.playerTeam);s.lotteries.push([{id:own.id,teams:[s.playerTeam,1],winner:s.playerTeam}]);
 assert.ok(!lostCandidates(s).some(c=>c.id===own.id));
});
