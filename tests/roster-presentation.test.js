import test from 'node:test';import assert from 'node:assert/strict';
import {rosterPlayer} from './polish-fixtures.mjs';
import {outrightRights,resolveRosterDecision} from '../dist/src/roster.js';
import {rosterDecisionPresentation} from '../dist/src/roster-presentation.js';
import {random,pick} from '../dist/src/random.js';
import {OVERSEAS_LEAGUES} from '../dist/src/data.js';
test('初outrightの若手は同意や自由契約ではなく結果を確認する',()=>{
 const s=rosterPlayer(),before=JSON.stringify(s),p=rosterDecisionPresentation(s);
 assert.equal(p.acceptLabel,'ウェーバー結果を確認する');assert.equal(p.declineLabel,null);assert.equal(JSON.stringify(s),before);
 assert.throws(()=>resolveRosterDecision(s,'decline'),/自由契約/);
});
test('3年ちょうどからoutrightに代えてFAを選べる',()=>{
 const under=rosterPlayer({service:515});under.year=under.records.at(-1).year;
 assert.equal(outrightRights(under).mayElectFA,false);
 const s=rosterPlayer({service:516});assert.equal(rosterDecisionPresentation(s).declineLabel,'配属を拒否して自由契約を選ぶ');
 assert.equal(resolveRosterDecision(s,'decline').type,'release');assert.ok(s.employment);assert.equal(s.team,'自由契約');
});
test('previous outrightがある若手にもFA選択権',()=>{
 const s=rosterPlayer({priorOutright:true});assert.equal(outrightRights(s).mayElectFA,true);assert.ok(rosterDecisionPresentation(s).declineLabel);
});
test('前季Super Two資格もoutright時のFA選択へ接続',()=>{
 const s=rosterPlayer({service:478});assert.equal(outrightRights(s).superTwo,true);assert.ok(rosterDecisionPresentation(s).declineLabel);
 s.records.at(-1).mlbServiceDays=85;assert.equal(outrightRights(s).superTwo,false);
 assert.equal(outrightRights(rosterPlayer({service:860})).superTwo,false,'3+ years is not Super Two');
});
test('5年ちょうどで降格同意・拒否権、未満は同意確認ではない',()=>{
 assert.equal(outrightRights(rosterPlayer({service:859})).consent,false);
 const s=rosterPlayer({service:860});assert.equal(s.rosterDecision.type,'consent');assert.equal(rosterDecisionPresentation(s).declineLabel,'降格拒否権を行使する');
 resolveRosterDecision(s,'decline');assert.equal(s.rosterDecision.type,'refusal');assert.ok(s.rosterDecision.tradeTeam);
});
for(const target of ['claim','clear'])test('waiver '+target+'の結果・40人枠・乱数消費が一致',()=>{
 let s,expected;for(let seed=1;seed<1000;seed++){
  const candidate=rosterPlayer({seed:Math.imul(seed,2654435761)>>>0}),copy=structuredClone(candidate),claimed=random(copy)<.2;
  if(claimed!==(target==='claim'))continue;
  if(claimed)copy.team=pick(copy,OVERSEAS_LEAGUES.flatMap(l=>l.teams).filter(t=>t!==copy.team));s=candidate;expected=copy;break;
 }
 assert.ok(s);const result=resolveRosterDecision(s,'accept');assert.equal(result.type,target);assert.equal(s.seed,expected.seed);assert.equal(s.team,expected.team);
 assert.equal(s.mlbRoster.on40,target==='claim');assert.equal(s.rosterDecision,null);assert.ok(s.news.includes(result.text));
 assert.match(result.text,target==='claim'?/ウェーバーで獲得。40人枠へ/:/40人枠外でマイナー配属/);
});
test('オプションの残る5年選手は同意後も40人枠維持、DFA扱いしない',()=>{
 const s=rosterPlayer({service:860,options:false}),p=rosterDecisionPresentation(s),before=s.seed;
 assert.equal(p.title,'マイナー配属への同意確認');assert.doesNotMatch(p.body,/DFA/);
 const result=resolveRosterDecision(s,'accept');assert.equal(result.type,'option');assert.equal(s.mlbRoster.on40,true);assert.equal(s.seed,before);
});
test('旧セーブの誤ったmayElectFAだけでは拒否権を作らない',()=>{
 const s=rosterPlayer();s.rosterDecision.mayElectFA=true;assert.equal(rosterDecisionPresentation(s).declineLabel,null);assert.throws(()=>resolveRosterDecision(s,'decline'));
});
