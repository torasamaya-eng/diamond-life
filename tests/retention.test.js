import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';
import {resolveRosterDecision} from '../dist/src/roster.js';
import {remain} from '../dist/src/market.js';
import {salaryEstimate,signRenewal} from '../dist/src/contracts.js';
import {emptyStats} from '../dist/src/stats.js';
import {OVERSEAS_LEAGUES,TEAMS} from '../dist/src/data.js';
function player(){
 const s=createPlayer('残留','batter',123);Object.assign(s,{stage:'mlb',year:2032,age:30,team:OVERSEAS_LEAGUES[0].teams[0],salary:20000,proYears:8});
 s.activeContract={team:s.team,annual:20000,startYear:2032,endYear:2033,years:2};
 s.rosterDecision={type:'consent',year:s.year};return s;
}
test('拒否後の残留・トレード・自由契約を全て処理し、契約と履歴を保持する',()=>{
 for(const choice of ['stay','trade','release']){
  const s=player(),old=s.team;resolveRosterDecision(s,'decline');assert.equal(s.rosterDecision.type,'refusal');
  resolveRosterDecision(s,choice);assert.equal(s.rosterDecision,null);
  if(choice==='release'){assert.equal(s.team,'自由契約');assert.ok(s.employment.options.length);assert.equal(s.activeContract,null);}
  else {assert.equal(s.salary,20000);assert.equal(s.activeContract.endYear,2033);assert.equal(s.mlbRoster.refusedYear,2032);if(choice==='stay')assert.equal(s.team,old);else{assert.notEqual(s.team,old);assert.equal(s.moves.at(-1).to,s.team);}}
 }
});
test('FA宣言残留は当該球団の評価を上げ、繰返し操作で増えず契約に合意できる',()=>{
 const s=player();s.stage='pro';s.team=TEAMS[0];s.rosterDecision=null;s.salary=3000;
 s.records=[{stats:{...emptyStats(),games:120,ab:450,hits:130,hr:18},stage:'pro'}];
 s.faDeclarations=[{year:s.year,kind:'fa',outcome:'交渉中'}];s.market={year:s.year,kind:'fa',closed:false};
 remain(s);assert.equal(s.faDeclarations[0].outcome,'宣言残留');assert.equal(s.clubTrust[s.team],.05);
 const trusted=structuredClone(s),normal=structuredClone(s);normal.clubTrust={};
 assert.ok(salaryEstimate(trusted,s.records[0])>salaryEstimate(normal,s.records[0]));
 remain(s);assert.equal(s.clubTrust[s.team],.05);
 signRenewal(s,'multi');assert.equal(s.activeContract.years,2);assert.equal(s.activeContract.team,s.team);
});
