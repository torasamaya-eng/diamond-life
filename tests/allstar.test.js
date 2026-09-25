import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';
import {allStarBallot,seasonAwards} from '../dist/src/awards.js';
import {emptyStats} from '../dist/src/stats.js';
function player(seed,role='batter'){const s=createPlayer('球宴テスト',role,seed);s.stage='pro';s.age=27;s.proYears=5;s.player.pitchRole='setup';return s;}
test('タイトル獲得で得票と選出率が上昇し、複数冠はさらに選出されやすい',()=>{const counts=[0,0,0];const st={...emptyStats(),games:130,ab:300,hits:75,hr:5,bb:20,so:60};for(let i=1;i<=1000;i++){const results=[[],['盗塁王'],['盗塁王','ベストナイン']].map(t=>allStarBallot(player(i*173),st,t));assert.ok(results[1].votes>results[0].votes);assert.ok(results[2].votes>results[1].votes);results.forEach((b,k)=>counts[k]+=Number(b.selected));}assert.ok(counts[0]<200,counts.join(','));assert.ok(counts[1]>850,counts.join(','));assert.ok(counts[2]>950&&counts[2]>=counts[1],counts.join(','));});
test('最多ホールド級の救援投手にもタイトルと実績が反映される',()=>{let selected=0;for(let i=1;i<=500;i++){const s=player(i*419,'pitcher');const r={stats:{...emptyStats(),games:60,outs:180,er:16,allowedHits:48,allowedWalks:18,so:70,holds:45},awards:[]};seasonAwards(s,r);assert.ok(r.awards.includes('最優秀中継ぎ'));if(s.allStars[0].selected)selected++;}assert.ok(selected>430);});
test('過去のWAR値で投票を変えず、短期間だけの出場は選出しない',()=>{const s=player(73),st={...emptyStats(),games:130,ab:500,hits:165,hr:25,bb:50};assert.deepEqual(allStarBallot(structuredClone(s),{...st,war:100}),allStarBallot(structuredClone(s),{...st,war:-100}));assert.equal(allStarBallot(s,{...st,games:10},['本塁打王','MVP']).selected,false);});
test('タイトル未獲得でも好成績は票に反映、過去の選考結果は維持',()=>{const s=player(999),weak={...emptyStats(),games:100,ab:300,hits:65,hr:3,so:80};const good={...weak,ab:500,hits:170,hr:30,bb:60};assert.ok(allStarBallot(structuredClone(s),good).votes>allStarBallot(structuredClone(s),weak).votes);s.allStars=[{year:2020,selected:false,votes:9000,rank:10}];seasonAwards(s,{stats:good,awards:[]});assert.deepEqual(s.allStars[0],{year:2020,selected:false,votes:9000,rank:10});});

