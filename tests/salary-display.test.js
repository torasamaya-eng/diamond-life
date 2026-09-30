import test from 'node:test';import assert from 'node:assert/strict';
import {money,salaryMoney,salaryDifference} from '../dist/src/format.js';
import {moneyUsd} from '../dist/src/mlb-contracts.js';
import {writeAutosave,readAutosave} from '../dist/src/autosave.js';
import {createCareerArchiveSnapshot,expandCareerState} from '../dist/src/archive.js';
import {rosterPlayer} from './polish-fixtures.mjs';
for(const [input,expected] of [[7842.3417,'約7,842万円'],[1906.5,'約1,907万円'],[11700,'1億1,700万円']])test('海外円表示のみ丸める '+input,()=>{assert.equal(salaryMoney(input,true),expected);});
test('国内円単位フォーマッターと増減表示は従来通り',()=>{
 assert.equal(money(6.6667),'6万6,667円');assert.equal(salaryMoney(6.6667,false),money(6.6667));assert.equal(salaryDifference(0,6.6667),'＋6万6,667円');
});
test('USD制度値は円表示丸めの影響を受けない',()=>{assert.equal(moneyUsd(1906.5),127100);assert.equal(moneyUsd(11700),780000);});
test('表示・オートセーブ・引退アーカイブで金銭精度と計算結果を維持',()=>{
 const s=rosterPlayer();s.retired=true;s.salary=7842.3417;s.activeContract.annual=s.salary;s.totalSalary=9758.8417;
 s.records=[{year:2039,age:27,stage:'mlb',team:s.team,salary:s.salary,paidSalary:1906.5,basePaidSalary:1906.5,stats:s.current,overseasPay:{majorPay:1463.125,minorPay:443.375}}];
 const before=JSON.stringify(s),income=s.salary+s.records[0].paidSalary;
 salaryMoney(s.salary,true);salaryMoney(s.totalSalary,true);const memory=new Map(),storage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)??null};
 assert.ok(writeAutosave(s,storage).ok);const loaded=readAutosave(storage);assert.equal(loaded.error,'');assert.equal(loaded.state.salary,s.salary);assert.deepEqual(loaded.state.records,s.records);
 const archive=expandCareerState(JSON.parse(JSON.stringify(createCareerArchiveSnapshot(s))));assert.deepEqual(archive.records,s.records);assert.equal(archive.totalSalary,s.totalSalary);assert.equal(archive.salary+archive.records[0].paidSalary,income);assert.equal(JSON.stringify(s),before);
});
