import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,retire} from '../dist/src/engine.js';
import {saveRetiredCareer,readCareerLibrary,deleteSavedCareer,MAX_SAVED_CAREERS,CAREER_LIBRARY_KEY} from '../dist/src/career-library.js';
import {AUTOSAVE_KEY,writeAutosave} from '../dist/src/autosave.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
function retired(i){const s=createPlayer('保存選手'+i,'batter',i+123);retire(s);return s;}
test('3枠の上限・ID重複・明示的入替・20枠への拡張',()=>{
 const storage=memory(),players=Array.from({length:21},(_,i)=>retired(i));
 assert.equal(MAX_SAVED_CAREERS,3);
 for(const p of players.slice(0,3))assert.equal(saveRetiredCareer(p,{storage}).ok,true);
 assert.equal(saveRetiredCareer(players[0],{storage}).alreadySaved,true);
 const before=storage.getItem(CAREER_LIBRARY_KEY);
 assert.equal(saveRetiredCareer(players[3],{storage}).full,true);assert.equal(storage.getItem(CAREER_LIBRARY_KEY),before);
 assert.equal(saveRetiredCareer(players[3],{storage,replaceId:players[1].careerId}).ok,true);
 assert.deepEqual(readCareerLibrary(storage).careers.map(c=>c.careerId),[players[0].careerId,players[3].careerId,players[2].careerId]);
 const large=memory();for(const p of players.slice(0,20))assert.equal(saveRetiredCareer(p,{storage:large,limit:20}).ok,true);
 assert.equal(saveRetiredCareer(players[20],{storage:large,limit:20}).full,true);
});
test('名鑑は完全な独立スナップショットで、新しい人生や削除はオートセーブに影響しない',()=>{
 const storage=memory(),saved=retired(1);assert.equal(saveRetiredCareer(saved,{storage}).ok,true);
 const copy=readCareerLibrary(storage).careers[0].state;assert.deepEqual(copy,saved);
 saved.player.name='変更';assert.notEqual(readCareerLibrary(storage).careers[0].state.player.name,saved.player.name);
 writeAutosave(createPlayer('新しい人生','batter',456),storage);const auto=storage.getItem(AUTOSAVE_KEY);
 assert.equal(readCareerLibrary(storage).careers.length,1);
 assert.equal(deleteSavedCareer(saved.careerId,storage).ok,true);assert.equal(storage.getItem(AUTOSAVE_KEY),auto);
});
test('現役・破損データを保存せず、容量不足の入替でも旧データを失わない',()=>{
 const storage=memory(),a=retired(1),b=retired(2);
 assert.equal(saveRetiredCareer(createPlayer(),{storage}).ok,false);
 saveRetiredCareer(a,{storage});const before=storage.getItem(CAREER_LIBRARY_KEY);
 const full={getItem:k=>storage.getItem(k),setItem(){throw Error('quota');}};
 assert.equal(saveRetiredCareer(b,{storage:full,replaceId:a.careerId}).ok,false);
 assert.equal(deleteSavedCareer(a.careerId,full).ok,false);assert.equal(storage.getItem(CAREER_LIBRARY_KEY),before);
 storage.setItem(CAREER_LIBRARY_KEY,'bad');
 assert.ok(readCareerLibrary(storage).error);assert.equal(saveRetiredCareer(b,{storage}).ok,false);assert.equal(storage.getItem(CAREER_LIBRARY_KEY),'bad');
});
