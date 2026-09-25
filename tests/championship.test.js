import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';
import {teamSeasonResult} from '../dist/src/championship.js';
import {createPostingChallenge,reviewPostingChallenge,eligibility,negotiate} from '../dist/src/market.js';
import {TEAMS} from '../dist/src/data.js';
import {emptyStats} from '../dist/src/stats.js';
import {advanceSeason} from './support.js';
function star(seed=71){const s=createPlayer('優勝検証','batter',seed);Object.assign(s,{stage:'pro',team:TEAMS[0],year:2031,age:28,proYears:8,salary:20000});for(const k in s.player.abilities)s.player.abilities[k]=90;s.records=Array.from({length:8},(_,i)=>({year:2023+i,stage:'pro',team:s.team,stats:{...emptyStats(),games:143,hr:40}}));return s;}
test('リーグ優勝と日本一を別判定し、下位優勝なし・2位から日本一もある',()=>{
 let firstOnly=0,secondJapan=0;for(let i=1;i<=300;i++){for(const rank of [1,2,4]){const s=star(i*167),r={stage:'pro',year:s.year,team:s.team,rank};teamSeasonResult(s,r);assert.equal(r.teamResult.leagueChampion,rank===1);if(rank===4)assert.equal(r.teamResult.japanChampion,false);if(rank===1&&!r.teamResult.japanChampion)firstOnly++;if(rank===2&&r.teamResult.japanChampion)secondJapan++;const count=s.timeline.length;teamSeasonResult(s,r);assert.equal(s.timeline.length,count);}}
 assert.ok(firstOnly>0&&secondJapan>0);
 const s=star(),r={stage:'corporate',rank:1};teamSeasonResult(s,r);assert.equal(r.teamResult,undefined);
});
test('全5種類の球団条件を提示し、年数は1〜3シーズンに限定',()=>{const types=new Set();for(let i=1;i<=300;i++){const s=star(i*131),c=createPostingChallenge(s);types.add(c.type);if(c.type==='years')assert.ok(c.eligibleYear>=s.year&&c.eligibleYear<=s.year+2);}assert.equal(types.size,5);});
test('リーグ優勝・日本一・タイトルはその年と球団の実績でのみ承認',()=>{
 for(const [type,result,awards] of [['league',{leagueChampion:true},[]],['japan',{japanChampion:true},[]],['title',{},['ベストナイン']]]){
 const s=star();s.postingChallenge={type,year:s.year,team:s.team,status:'pending',target:1,label:type};
 const r={year:s.year,team:s.team,stage:'pro',stats:emptyStats(),teamResult:result,awards};
 reviewPostingChallenge(s,{...r,year:s.year-1});assert.equal(s.postingChallenge.status,'pending');
 reviewPostingChallenge(s,{...r,team:TEAMS[1]});assert.equal(s.postingChallenge.status,'pending');
 reviewPostingChallenge(s,r);assert.equal(s.postingChallenge.status,'achieved');assert.equal(eligibility(s,'posting'),'');
 const offer=negotiate(s,'posting',true);assert.equal(offer.permissionGranted,true);
 const bad=star();bad.postingChallenge={type,year:bad.year,team:bad.team,status:'pending',target:1,label:type};reviewPostingChallenge(bad,{...r,teamResult:{},awards:[]});assert.equal(bad.postingChallenge.status,'failed');
 }
});
test('在籍年数条件は翌年も維持され、期限前の再交渉で抽選し直せない',()=>{
 const s=star();s.postingChallenge={type:'years',year:2031,eligibleYear:2033,team:s.team,target:1,label:'2033年終了後',status:'pending'};
 for(const year of [2031,2032]){s.year=year;reviewPostingChallenge(s,{year,stage:'pro',team:s.team,stats:emptyStats()});assert.equal(s.postingChallenge.status,'pending');assert.throws(()=>negotiate(s,'posting'),/2033/);}
 s.year=2033;reviewPostingChallenge(s,{year:2033,stage:'pro',team:TEAMS[1],stats:emptyStats()});assert.equal(s.postingChallenge.status,'pending');
 reviewPostingChallenge(s,{year:2033,stage:'pro',team:s.team,stats:emptyStats()});assert.equal(s.postingChallenge.status,'achieved');assert.equal(negotiate(s,'posting',true).permissionGranted,true);
});
test('通常シーズン進行でチーム結果を記録してから球団課題を判定',()=>{
 let win=0,lose=0;for(let i=1;i<=50;i++){const s=star(i*149);s.postingChallenge={type:'league',year:s.year,team:s.team,target:1,label:'優勝',status:'pending'};advanceSeason(s);const r=s.records.at(-1);assert.ok(r.teamResult);assert.equal(s.postingChallenge.status,r.teamResult.leagueChampion?'achieved':'failed');if(r.teamResult.leagueChampion)win++;else lose++;}
 assert.ok(win&&lose);
});
