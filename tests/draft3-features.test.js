import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,finishDraft,startDraft,pick,recommended,cpuOrder} from '../dist/draft/draft.js';
import {compareCandidates,toggleComparison,setReason,reasonReview,evidence} from '../dist/draft/scouting.js';
import {watchedCandidates,revealWatched} from '../dist/draft/watchlist.js';
import {revealCareers,simulateCareer,careerCompetition} from '../dist/draft/career.js';
import {needProgress,NEEDS} from '../dist/draft/teams.js';
import {TEAMS} from '../dist/draft/config.js';
import {saveSession,loadSession} from '../dist/draft/storage.js';

test('draft3 comparison: three public dossiers, removable, persistent and no hidden future',()=>{
 const s=createSession(7);for(const c of s.candidates.slice(0,3))toggleComparison(s,c.id);
 assert.equal(compareCandidates(s).length,3);assert.ok(compareCandidates(s).every(c=>!('hidden'in c)));
 assert.throws(()=>toggleComparison(s,s.candidates[3].id),/3人/);toggleComparison(s,s.candidates[0].id);assert.equal(compareCandidates(s).length,2);
 let raw;saveSession(s,{setItem:(k,v)=>raw=v});assert.deepEqual(loadSession({getItem:()=>raw}).state.compareIds,s.compareIds);
});
test('draft3 reason: optional and invalid values are rejected',()=>{const s=createSession(1),id=s.candidates[0].id;setReason(s,id,'守備');assert.equal(s.reasons[id],'守備');setReason(s,id,'');assert.equal(s.reasons[id],'');assert.throws(()=>setReason(s,id,'必ずスター'),/不正/);});
test('draft3 reason: snapshot on acquisition, never mutable after selection',()=>{
 const s=createSession(8);for(const c of s.candidates)setReason(s,c.id,'将来性');finishDraft(s);
 const mine=s.picks.filter(p=>p.team===s.playerTeam);assert.ok(mine.every(p=>p.reason==='将来性'));assert.ok(s.picks.filter(p=>p.team!==s.playerTeam).every(p=>!p.reason));
 assert.throws(()=>setReason(s,mine[0].id,'打撃'));s.reasons[mine[0].id]='守備';assert.equal(mine[0].reason,'将来性');assert.match(reasonReview(revealCareers(s)[0]),/将来性を期待/);
});
test('draft3 reason: unrecorded historic decisions are not invented',()=>{const s=finishDraft(createSession(4));assert.match(reasonReview(revealCareers(s)[0]),/記録なし/);});
test('draft3 watched: unavailable before results, cached exactly and compatible with save reload',()=>{
 const s=finishDraft(createSession(2)),p=s.picks.find(p=>p.team!==s.playerTeam);s.favorites=[p.id];
 assert.throws(()=>revealWatched(s,p.id));revealCareers(s);const before=JSON.stringify(s.results),r=revealWatched(s,p.id);
 assert.deepEqual(r,simulateCareer(s.candidates.find(c=>c.id===p.id),p,s.seed,s.clubs[p.team].needs,{peers:careerCompetition(s)}));assert.equal(revealWatched(s,p.id),r);assert.equal(JSON.stringify(s.results),before);
 let raw;saveSession(s,{setItem:(k,v)=>raw=v});const loaded=loadSession({getItem:()=>raw}).state;assert.deepEqual(revealWatched(loaded,p.id),r);
});
test('draft3 watched: lost ballots and fallback choices retained, own picks excluded',()=>{const s=finishDraft(createSession(3)),other=s.picks.find(p=>p.team!==s.playerTeam),mine=s.picks.find(p=>p.team===s.playerTeam);s.favorites=[mine.id];s.lotteries.push([{id:other.id,teams:[s.playerTeam,other.team],winner:other.team}]);assert.ok(watchedCandidates(s).some(c=>c.id===other.id));assert.ok(!watchedCandidates(s).some(c=>c.id===mine.id));});
test('draft3 undrafted: no fabricated professional career',()=>{const s=finishDraft(createSession(6)),id=s.undrafted[0].id;s.fallbacks=[id];revealCareers(s);const result=revealWatched(s,id);assert.equal(result.undrafted,true);assert.ok(!result.rows);assert.equal(s.watchedResults,undefined);});
test('draft3 CPU: completed recruitment lowers matching targets, talent can still override',()=>{
 const s=createSession(5),club=s.clubs[1],college=s.candidates.filter(c=>c.category==='大学'),other=s.candidates.find(c=>c.category==='高校');club.needs=[{...NEEDS.college,priority:'最優先'}];club.board=[college[0].id,other.id,college[1].id];
 assert.equal(cpuOrder(s,1)[0],college[0].id);s.picks.push({id:college[1].id,team:1});assert.equal(cpuOrder(s,1)[0],other.id);
 delete s.adaptiveCPU;assert.deepEqual(cpuOrder(s,1),club.board);
});
test('draft3 CPU: ignores hidden changes, seeded operations remain reproducible',()=>{
 const a=createSession(18),b=createSession(18);assert.deepEqual(finishDraft(a).picks,finishDraft(b).picks);
 const order=cpuOrder(a,1);for(const c of a.candidates)c.hidden={potential:999,success:true};assert.deepEqual(cpuOrder(a,1),order);
});
const rows=(n,team=TEAMS[0])=>Array.from({length:n},()=>({team,role:'先発',stats:{games:25,outs:450}}));
for(const [n,label] of [[0,'候補確保'],[1,'一軍起用'],[3,'主力定着'],[7,'長期貢献']])test(`draft3 need milestone: ${label}`,()=>{const p=needProgress({rows:rows(n)},NEEDS.starter,TEAMS[0]);assert.equal(p.milestone,label);assert.equal(p.years,n);});
test('draft3 needs: late success and another team success are separate',()=>{const quiet=rows(4).map(y=>({...y,stats:{games:0,outs:0}})),late=needProgress({rows:[...quiet,...rows(4)]},NEEDS.starter,TEAMS[0]);assert.equal(late.onTime,false);assert.match(late.text,/間に合わなかった/);const away=needProgress({rows:rows(5,TEAMS[1])},NEEDS.starter,TEAMS[0]);assert.equal(away.years,0);assert.equal(away.awayYears,5);assert.match(away.text,/移籍先/);});
test('draft3 evidence: sample size and opponents stay independent of performance',()=>{const c=createSession(7).candidates.find(c=>c.role==='野手');c.history=[{stats:{ab:30,hits:20},league:'地域リーグ'}];assert.equal(evidence(c).sample,'少数試合');assert.equal(evidence(c).strong,'強豪相手は未確認');c.history[0].stats.ab=220;assert.equal(evidence(c).sample,'十分な実績');c.history[0].national={stats:{ab:10,games:3}};assert.equal(evidence(c).strong,'強豪対戦は少数');});

test('draft3 previous v2 saves: additive features need no destructive migration',()=>{
 const s=createSession(9);delete s.adaptiveCPU;delete s.compareIds;delete s.reasons;
 let raw;saveSession(s,{setItem:(k,v)=>raw=v});const old=loadSession({getItem:()=>raw}).state;
 assert.deepEqual(cpuOrder(old,1),old.clubs[1].board);toggleComparison(old,old.candidates[0].id);setReason(old,old.candidates[0].id,'将来性');assert.equal(compareCandidates(old).length,1);
 finishDraft(old);assert.equal(revealCareers(old).length,5);
});

test('draft3 needs: college relief contribution uses relief appearances rather than batter games',()=>{
 const career={rows:Array.from({length:7},()=>({team:TEAMS[0],role:'中継ぎ',stats:{games:45,outs:150}}))};
 assert.equal(needProgress(career,NEEDS.college,TEAMS[0]).milestone,'長期貢献');
});
