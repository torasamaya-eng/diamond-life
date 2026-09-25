import test from 'node:test';
import assert from 'node:assert/strict';
import {firstTeamAllowance,settleSalary} from '../dist/src/finance.js';
import {createPlayer,advanceYear} from '../dist/src/engine.js';
import {setContract,signRenewal} from '../dist/src/contracts.js';
import {money} from '../dist/src/format.js';
test('一軍登録0・1・75・149・150・183日を日割りし、1600万円で頭打ち',()=>{
 for(const base of [420,600,1000,1599]){
 assert.equal(firstTeamAllowance(base,0),0);assert.equal(firstTeamAllowance(base,75),(1600-base)/2);
 assert.equal(firstTeamAllowance(base,150),1600-base);assert.equal(firstTeamAllowance(base,183),1600-base);
 assert.equal(firstTeamAllowance(base,1),Math.round((1600-base)*10000/150)/10000);
 assert.equal(firstTeamAllowance(base,149),Math.round((1600-base)*10000*149/150)/10000);
 }assert.equal(firstTeamAllowance(1600,183),0);assert.equal(firstTeamAllowance(5000,183),0);
});
test('育成・海外・独立は国内一軍追加報酬の対象外、円単位で表示',()=>{
 assert.equal(firstTeamAllowance(240,150,'pro','development'),0);
 assert.equal(firstTeamAllowance(420,150,'mlb'),0);assert.equal(firstTeamAllowance(420,150,'independent'),0);
 assert.equal(money(firstTeamAllowance(600,1)),'6万6,667円');assert.equal(money(1600),'1,600万円');
});
test('FA特例や登板数ではなく登録実日数を使い、二重精算を防ぐ',()=>{
 const s=createPlayer();const r={stage:'pro',contractStatus:'registered',salary:600,year:2030,firstTeamDays:145,faDays:145,dailyRoster:{counts:{active:75}},stats:{games:10}};
 settleSalary(s,r);assert.equal(r.firstTeamAllowance,500);assert.equal(r.paidSalary,1100);assert.equal(s.totalSalary,1100);
 settleSalary(s,r);assert.equal(s.totalSalary,1100);assert.equal(s.totalFirstTeamAllowance,500);
});
test('複数年契約の基本年俸を変えず、年度ごとの日数に応じて追加',()=>{
 const s=createPlayer('追加報酬','batter',781);Object.assign(s,{stage:'pro',team:'大阪ブレイバーズ',year:2030,age:25});for(const k in s.player.abilities){s.player.abilities[k]=90;s.player.potential[k]=99;}setContract(s,600,3);
 for(let i=0;i<2;i++){s.nationalOfferYear=s.year;advanceYear(s);assert.equal(s.salary,600);assert.equal(s.activeContract.annual,600);}
 const expected=s.records.reduce((sum,r)=>sum+Math.round(r.paidSalary*10000),0)/10000;
 assert.equal(s.totalSalary,expected);assert.ok(s.records.every(r=>r.paidSalary>=600&&r.paidSalary<=1600));assert.ok(s.records.some(r=>r.firstTeamAllowance>0));
});
