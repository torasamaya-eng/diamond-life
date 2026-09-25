import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,advance} from '../dist/src/engine.js';
import {randomPlayerName,newCareerId} from '../dist/src/identity.js';
import {writeAutosave,readAutosave,AUTOSAVE_KEY} from '../dist/src/autosave.js';
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('自然な姓名を生成し、名前とIDの生成はシミュレーション乱数に影響しない',()=>{
 const names=new Set(Array.from({length:100},randomPlayerName));assert.ok(names.size>50);
 for(const name of names)assert.match(name,/^[一-龯]+ [一-龯]+$/);
 const a=createPlayer('同じ名前','batter',123),b=createPlayer('同じ名前','batter',123);
 assert.notEqual(a.careerId,b.careerId);assert.equal(a.seed,b.seed);assert.deepEqual(a.player,b.player);
 assert.equal(new Set(Array.from({length:1000},newCareerId)).size,1000);
 const edited=createPlayer('好きな名前','pitcher',456);assert.equal(edited.player.name,'好きな名前');
});
test('開始・進行・選択待ちを保存し、IDと乱数を保ったまま再開する',()=>{
 const storage=memory(),s=createPlayer('再開','batter',123);advance(s);
 s.pending={type:'middle'};
 assert.equal(writeAutosave(s,storage).ok,true);
 const loaded=readAutosave(storage);assert.equal(loaded.error,'');assert.deepEqual(loaded.state,s);
 assert.equal(loaded.state.careerId,s.careerId);
 loaded.state.pending=null;s.pending=null;advance(loaded.state);advance(s);
 assert.deepEqual(loaded.state,s);
});
test('破損・未知バージョン・アクセス拒否・容量不足でも例外を外に出さず旧データを保護',()=>{
 const storage=memory();assert.equal(readAutosave(storage).exists,false);
 storage.setItem(AUTOSAVE_KEY,'{broken');assert.equal(readAutosave(storage).state,null);
 storage.setItem(AUTOSAVE_KEY,JSON.stringify({version:999}));assert.match(readAutosave(storage).error,/バージョン/);
 const s=createPlayer('保存','batter',123);writeAutosave(s,storage);const before=storage.getItem(AUTOSAVE_KEY);
 const blocked={getItem(){throw Error('denied');},setItem(){throw Error('quota');}};
 assert.equal(readAutosave(blocked).state,null);assert.equal(writeAutosave(s,blocked).ok,false);
 assert.equal(storage.getItem(AUTOSAVE_KEY),before);
 const broken=JSON.parse(before);broken.payload=broken.payload.replace('保存','破損');storage.setItem(AUTOSAVE_KEY,JSON.stringify(broken));
 assert.equal(readAutosave(storage).state,null);
});
