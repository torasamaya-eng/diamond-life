import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';
import {emptyStats,simulateStats,sumStats} from '../dist/src/stats.js';
import {fieldingRate,FIELDING_KEYS} from '../dist/src/fielding.js';
test('守備位置・専門起用・DH・投手ごとの守備機会を生成する',()=>{
 const s=createPlayer('守備','batter',123);s.stage='pro';s.player.batterRole='regular';
 for(const k in s.player.abilities)s.player.abilities[k]=80;
 const play=(position,role='regular')=>simulateStats({...s,player:{...s.player,position,batterRole:role}},100);
 const first=play('first'),short=play('shortstop'),out=play('center'),sub=play('shortstop','defense'),dh=play('dh');
 assert.ok(first.putouts>short.putouts);assert.ok(short.assists>out.assists);
 assert.equal(sub.fieldGames,100);assert.ok(sub.putouts+sub.assists<short.putouts+short.assists);
 for(const key of FIELDING_KEYS)assert.equal(dh[key],0);
 assert.equal(fieldingRate(dh),null);
 s.player.role='pitcher';s.player.pitchRole='starter';const pitcher=simulateStats(s,20);
 assert.equal(pitcher.fieldGames,20);assert.ok(pitcher.assists>0);
 for(const st of [first,short,out,sub,pitcher]){
  for(const k of FIELDING_KEYS)assert.ok(Number.isInteger(st[k])&&st[k]>=0);
  assert.ok(st.doublePlays<=st.putouts+st.assists);
  assert.ok(fieldingRate(st)>=0&&fieldingRate(st)<=1);
 }
});
test('守備率の通算は機会数から算出、未知の過去記録をゼロ扱いしない',()=>{
 const a={...emptyStats(),games:10,fieldGames:10,putouts:9,assists:0,errors:1};
 const b={...emptyStats(),games:100,fieldGames:100,putouts:900,assists:90,errors:10};
 const total=sumStats([a,b]);
 assert.equal(total.fieldGames,110);assert.equal(fieldingRate(total),999/1010);
 assert.notEqual(fieldingRate(total),(fieldingRate(a)+fieldingRate(b))/2);
 const unknown={...a};delete unknown.fieldingKnown;
 assert.equal(fieldingRate(sumStats([a,unknown])),null);
 assert.equal(fieldingRate(emptyStats()),null);
});
