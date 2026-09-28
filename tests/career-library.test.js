import {libraryOptions,abortingDatabase} from './library-helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,retire} from '../dist/src/engine.js';
import {saveRetiredCareer,readCareerLibrary,deleteSavedCareer,MAX_SAVED_CAREERS,CAREER_LIBRARY_KEY} from '../dist/src/career-library.js';
import {AUTOSAVE_KEY,writeAutosave} from '../dist/src/autosave.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
function retired(i){const s=createPlayer('保存選手'+i,'batter',i+123);retire(s);return s;}
test('3枠の上限・ID重複・明示的入替・20枠への拡張',async()=>{
 const db=libraryOptions(),storage=db.storage,players=Array.from({length:21},(_,i)=>retired(i));
 assert.equal(MAX_SAVED_CAREERS,3);
 for(const p of players.slice(0,3))assert.equal((await saveRetiredCareer(p,db)).ok,true);
 assert.equal((await saveRetiredCareer(players[0],db)).alreadySaved,true);
 const before=await readCareerLibrary(db);
 assert.equal((await saveRetiredCareer(players[3],db)).full,true);assert.deepEqual(await readCareerLibrary(db),before);
 assert.equal((await saveRetiredCareer(players[3],{...db,replaceId:players[1].careerId})).ok,true);
 assert.deepEqual((await readCareerLibrary(db)).careers.map(c=>c.careerId).sort(),[players[0].careerId,players[3].careerId,players[2].careerId].sort());
 const large=libraryOptions();for(const p of players.slice(0,20))assert.equal((await saveRetiredCareer(p,{...large,limit:20})).ok,true);
 assert.equal((await saveRetiredCareer(players[20],{...large,limit:20})).full,true);
});
test('名鑑は完全な独立スナップショットで、新しい人生や削除はオートセーブに影響しない',async()=>{
 const db=libraryOptions(),storage=db.storage,saved=retired(1);assert.equal((await saveRetiredCareer(saved,db)).ok,true);
 const copy=(await readCareerLibrary(db)).careers[0].state;for(const key of ['player','records','teams','drafts','nationalHistory','awards','honors','afterlife','incomeHistory','developmentHistory'])assert.deepEqual(copy[key],saved[key],key);
 saved.player.name='変更';assert.notEqual((await readCareerLibrary(db)).careers[0].state.player.name,saved.player.name);
 writeAutosave(createPlayer('新しい人生','batter',456),storage);const auto=storage.getItem(AUTOSAVE_KEY);
 assert.equal((await readCareerLibrary(db)).careers.length,1);
 assert.equal((await deleteSavedCareer(saved.careerId,db)).ok,true);assert.equal(storage.getItem(AUTOSAVE_KEY),auto);
});
test('現役・破損データを保存せず、容量不足の入替でも旧データを失わない',async()=>{
 const db=libraryOptions(),storage=db.storage,a=retired(1),b=retired(2);
 assert.equal((await saveRetiredCareer(createPlayer(),db)).ok,false);
 await saveRetiredCareer(a,db);const before=await readCareerLibrary(db);
 const full={...db,indexedDB:abortingDatabase(db.indexedDB)};
 assert.equal((await saveRetiredCareer(b,{...full,replaceId:a.careerId})).ok,false);
 assert.equal((await deleteSavedCareer(a.careerId,{...db,indexedDB:abortingDatabase(db.indexedDB,{failDelete:true})})).ok,false);assert.deepEqual(await readCareerLibrary(db),before);
 storage.setItem(CAREER_LIBRARY_KEY,'bad');
 assert.ok((await readCareerLibrary(db)).error);assert.equal((await saveRetiredCareer(b,db)).ok,false);assert.equal(storage.getItem(CAREER_LIBRARY_KEY),'bad');
});
