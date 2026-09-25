import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,advanceYear,chooseEmployment} from '../dist/src/engine.js';
import {simulateDailyRoster,mlbService,prepareRosterDecision,resolveRosterDecision,optionAllowance} from '../dist/src/roster.js';
import {recordFAService} from '../dist/src/free-agency.js';
import {simulateRegisteredLevels} from '../dist/src/levels.js';
import {eligibility,negotiate,acceptOffer,MLB_TEAMS} from '../dist/src/market.js';
import {emptyStats} from '../dist/src/stats.js';
function player(stage='pro',role='batter',seed=71){
 const s=createPlayer('日次検証',role,seed);Object.assign(s,{stage,age:28,year:2031,team:stage==='mlb'?MLB_TEAMS[0]:'大阪ブレイバーズ',salary:15000});
 for(const k in s.player.abilities)s.player.abilities[k]=75;s.player.pitchRole=role==='pitcher'?'starter':'bench';return s;
}
test('NPBの日別登録：抹消日から10日間は再登録不可、出場は登録中または二軍のみ',()=>{
 let moves=0;
 for(let i=1;i<=50;i++){const s=player('pro','batter',i*617),r=simulateDailyRoster(s,.5);assert.equal(r.days.length,183);
 for(const t of r.transactions){if(t.reason.includes('登録抹消')){moves++;const next=r.transactions.find(n=>n.day>t.day&&n.to==='first');if(next)assert.ok(next.day>=t.day+10);}}
 assert.equal(r.counts.active,r.days.filter(d=>d.onActive).length);
 assert.equal(r.games.first,r.days.filter(d=>d.played&&d.level==='first').length);
 assert.equal(r.games.second,r.days.filter(d=>d.played&&d.level==='second').length);
 const record={stage:'pro',contractStatus:'registered',dailyRoster:r};recordFAService(s,record);assert.equal(record.firstTeamDays,r.counts.active);assert.equal(record.faDays,Math.min(145,r.counts.active));
 }assert.ok(moves>50);
});
test('登板のない休養日も登録日数に算入、育成と全休は出場ゼロ',()=>{
 const p=player('pro','pitcher'),r=simulateDailyRoster(p,1);assert.equal(r.counts.active,183);assert.ok(r.games.first<=31&&r.games.first>=25);assert.equal(r.service,145);
 const d=player();d.contractStatus='development';const farm=simulateDailyRoster(d,1);assert.equal(farm.counts.active,0);assert.ok(farm.games.second>0);
 const injured=player();const absent=simulateDailyRoster(injured,1,{startDay:0,unavailableDays:400});assert.equal(absent.games.first+absent.games.second,0);
});
test('故障抹消は復帰まで二軍出場もなく、前年145日なら最大60日の特例',()=>{
 const s=player();s.records=[{year:2030,stage:'pro',firstTeamDays:183}];const r=simulateDailyRoster(s,1,{startDay:30,unavailableDays:100});
 assert.ok(r.counts.injuryCredit<=60&&r.counts.injuryCredit>0);
 assert.ok(r.days.filter(d=>d.day>=30&&d.day<130).every(d=>!d.played&&!d.onActive));
});
test('海外は野手10日・投手15日待機、降格5回まで、20日以上で年1回だけoption消費',()=>{
 for(const role of ['batter','pitcher'])for(let i=1;i<=40;i++){
 const s=player('mlb',role,i*1151),r=simulateDailyRoster(s,.5);assert.ok(r.demotions<=5);
 for(const t of r.transactions.filter(t=>t.reason==='マイナーへオプション配属')){const next=r.transactions.find(n=>n.day>t.day&&n.to==='major');if(next)assert.ok(next.day-t.day>=(role==='pitcher'?15:10));}
 assert.equal(s.mlbRoster.optionYears.length,r.counts.option>=20?1:0);
 assert.ok(r.days.filter(d=>d.status==='major').every(d=>d.on40));
 }
});
test('MLBの負傷者リストはメジャー日数に算入、60日ILは40人枠外',()=>{
 const s=player('mlb');const r=simulateDailyRoster(s,1,{startDay:15,unavailableDays:90});assert.equal(r.counts.il,90);
 assert.ok(r.days.filter(d=>d.status==='il60').every(d=>!d.on40&&d.service&&!d.played));assert.equal(r.service,172);
 assert.equal(r.days.find(d=>d.date.endsWith('09-01')).activeLimit,28);
});
test('マイナー成績は別集計、メジャーFAは6年×172日で解禁',()=>{
 const s=player('mlb');const roster=simulateDailyRoster(s,0);const levels=simulateRegisteredLevels(s,roster);
 assert.equal(levels.first.games,0);assert.ok(levels.second.games>0);assert.equal(roster.service,0);
 s.records=Array.from({length:6},(_,i)=>({year:2024+i,stage:'mlb',mlbServiceDays:172,stats:{...emptyStats(),games:140,ab:500,hits:160,hr:30}}));
 assert.equal(mlbService(s),1032);assert.equal(eligibility(s,'mlbFa'),'');const board=negotiate(s,'mlbFa',true);assert.ok(board.offers.length);acceptOffer(s,board.offers[0].id);assert.equal(s.moves.at(-1).kind,'mlbFa');
});
test('ベテラン降格同意、DFA拒否権、ウェーバー後の配属と進行',()=>{
 const s=player('mlb');for(const k in s.player.abilities)s.player.abilities[k]=60;
 s.records=Array.from({length:5},(_,i)=>({year:2024+i,stage:'mlb',mlbServiceDays:172,stats:emptyStats()}));
 assert.ok(prepareRosterDecision(s));assert.equal(s.rosterDecision.type,'consent');resolveRosterDecision(s,'decline');
 const r=simulateDailyRoster(s,.05);assert.equal(r.counts.active,187);
 const t=player('mlb');for(const k in t.player.abilities)t.player.abilities[k]=60;
 t.mlbRoster={optionYears:[2025,2026,2027,2028],on40:true,outrighted:true};
 assert.equal(optionAllowance(t),0);assert.ok(prepareRosterDecision(t));assert.equal(t.rosterDecision.type,'dfa');resolveRosterDecision(t,'decline');
 assert.ok(t.employment);chooseEmployment(t,'return');assert.equal(t.stage,'pro');advanceYear(t);assert.ok(t.records.length);
});
test('40人枠外のマイナー選手を再度DFAせず翌季も配属可能',()=>{
 const s=player('mlb');for(const k in s.player.abilities)s.player.abilities[k]=50;s.mlbRoster={optionYears:[2025,2026,2027,2028],on40:false,outrighted:true,outrightYear:2030};
 assert.equal(prepareRosterDecision(s),false);const r=simulateDailyRoster(s,0);assert.ok(r.days.every(d=>d.status==='minor'&&!d.on40));assert.equal(r.demotions,0);assert.equal(r.service,0);
});
