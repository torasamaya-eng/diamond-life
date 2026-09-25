import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,chooseEmployment} from '../dist/src/engine.js';
import {prepareRenewal,signRenewal,setContract,salaryEstimate} from '../dist/src/contracts.js';
import {reviewEmployment} from '../dist/src/lifecycle.js';
import {emptyStats} from '../dist/src/stats.js';
import {rosterFromGames} from '../dist/src/levels.js';
import {TEAMS} from '../dist/src/data.js';
function player(seed=42){const s=createPlayer('検証','batter',seed);Object.assign(s,{stage:'pro',age:35,year:2035,team:TEAMS[0],proYears:10,salary:420,contractStatus:'registered'});return s;}
test('支配下最低420万円・育成最低240万円で契約でき、査定も下限を守る',()=>{
 const s=player();setContract(s,100);assert.equal(s.salary,420);assert.equal(s.activeContract.annual,420);
 const r={stats:emptyStats(),overall:20,roster:'二軍'};assert.ok(salaryEstimate(s,r)>=420);
 s.contractStatus='development';setContract(s,100);assert.equal(s.salary,240);assert.equal(salaryEstimate(s,r),240);
});
test('試合数から一軍・二軍・育成・全休を区別する',()=>{
 const levels=(a,b)=>({first:{games:a},second:{games:b}});
 assert.equal(rosterFromGames(levels(90,10)),'一軍中心');assert.equal(rosterFromGames(levels(3,90)),'二軍中心');
 assert.equal(rosterFromGames(levels(0,0)),'出場なし（療養・調整中）');assert.equal(rosterFromGames(levels(0,50),'development'),'育成・二軍');
});
test('長期離脱の育成打診は任意で、複数年契約中は提示せず、復帰間近なら提示しない',()=>{
 const s=player();s.health={name:'膝靱帯損傷',daysLeft:180};const r={stats:emptyStats(),overall:40,salary:420,roster:'全休'};
 prepareRenewal(s,r);reviewEmployment(s,r);assert.equal(s.employment,null);assert.ok(s.contractOffers.some(o=>o.id==='one'));assert.ok(s.contractOffers.some(o=>o.id==='rehab'));
 s.year++;signRenewal(s,'rehab');assert.equal(s.contractStatus,'development');assert.ok(s.salary>=240);assert.equal(s.activeContract.type,'育成・リハビリ');
 const other=player();other.health={name:'膝靱帯損傷',daysLeft:180};setContract(other,1500,3);prepareRenewal(other,r);assert.equal(other.contractOffers.length,0);assert.equal(other.salary,1500);
 const recovered=player();recovered.health={name:'捻挫',daysLeft:20};prepareRenewal(recovered,r);assert.ok(!recovered.contractOffers.some(o=>o.id==='rehab'));
});
test('アカデミーコーチと球団職員の打診を受け、引退後の専用物語へ進む',()=>{
 for(const role of ['academy','staff']){
 const s=player();reviewEmployment(s,{overall:30,stats:emptyStats()});assert.ok(s.employment.options.some(o=>o.id===role));const total=s.totalSalary;
 chooseEmployment(s,role);assert.equal(s.retired,true);assert.equal(s.totalSalary,total);assert.equal(s.afterlife.route,role==='academy'?'アカデミーコーチ':'球団職員');assert.ok(s.afterlife.entries.length>10);
 assert.ok(s.afterlife.entries.some(e=>role==='academy'?/アカデミー|子ども|育成/.test(e.text):/運営|球団|ファン/.test(e.text)));
 }
});
