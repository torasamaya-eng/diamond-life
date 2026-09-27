import test from 'node:test';
import assert from 'node:assert/strict';
import {retiredNumberEligible} from '../dist/src/awards.js';
import {emptyStats} from '../dist/src/stats.js';
function fixture(role,years,stats){
 const team='テスト球団';
 return {player:{role},records:Array.from({length:years},(_,i)=>({year:2030+i,team,stats:{...emptyStats(),games:60,...stats}})),awards:[],recordHistory:[],team};
}
function awards(s,title,n){for(let i=0;i<n;i++)s.awards.push({year:2030+i,team:s.team,title});}
test('長期貢献と5年の主要タイトルでMVPのない救援投手も永久欠番対象',()=>{
 const s=fixture('pitcher',15,{saves:22});awards(s,'最多セーブ',5);
 assert.equal(retiredNumberEligible(s,s.team,s.records),true);
 assert.equal(retiredNumberEligible(s,s.team,s.records.slice(1)),false);
 s.awards.forEach(a=>a.year=2030);assert.equal(retiredNumberEligible(s,s.team,s.records),false);
});
test('通算とMVP・多数タイトル・ベストナインを兼備した打者を評価',()=>{
 const s=fixture('batter',14,{hits:150,hr:15});awards(s,'最多安打',8);awards(s,'ベストナイン',7);awards(s,'最優秀選手（MVP）',1);
 assert.equal(retiredNumberEligible(s,s.team,s.records),true);
 s.awards=s.awards.filter(a=>a.title!=='最優秀選手（MVP）');assert.equal(retiredNumberEligible(s,s.team,s.records),false);
});
test('他球団の表彰や長期在籍だけでは永久欠番にならず判定は状態を変更しない',()=>{
 const s=fixture('pitcher',20,{saves:16});awards(s,'最多セーブ',5);s.awards.forEach(a=>a.team='別球団');
 const before=structuredClone(s);assert.equal(retiredNumberEligible(s,s.team,s.records),false);assert.deepEqual(s,before);
});
