import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,retire} from '../dist/src/engine.js';
import {compactCareerState,expandCareerState,createCareerArchiveSnapshot,careerReview} from '../dist/src/archive.js';
import {readAutosave,writeAutosave,AUTOSAVE_KEY} from '../dist/src/autosave.js';
import {saveRetiredCareer,readCareerLibrary,migrateCareerLibrary,CAREER_LIBRARY_KEY,CAREER_DATABASE} from '../dist/src/career-library.js';
import {runNewCareerAd,runFinalCareerAd,CAREER_AD_LEDGER_KEY,MAX_AD_LEDGER_CAREERS} from '../dist/src/ads.js';
import {libraryOptions,libraryMemory,abortingDatabase} from './library-helpers.mjs';
import {careerCardData} from '../dist/src/share.js';
function retired(seed){const s=createPlayer('保存 監査','batter',seed);retire(s);return s;}
async function mutate(db,fn){const r=db.indexedDB.open(CAREER_DATABASE,1);const open=await new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{const tx=open.transaction('careers','readwrite');fn(tx.objectStore('careers'));tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});open.close();}
test('日次履歴は重複を一度だけ保存、欠落項目を含めlossless復元する',()=>{
 const s=retired(11),roster={stage:'pro',year:2030,counts:{active:2},transactions:[],days:[{day:0,status:'first',nullable:null},{day:1,status:'second',extra:1}]};
 s.rosterHistory=[roster];s.records=[];s.extra={dailyRoster:roster};const p=compactCareerState(s);assert.equal(p.rosters.length,1);assert.deepEqual(expandCareerState(JSON.parse(JSON.stringify(p))),s);
 const db=libraryMemory();writeAutosave(s,db);const loaded=readAutosave(db);assert.equal(loaded.error,'');assert.deepEqual(loaded.state.rosterHistory,s.rosterHistory);assert.equal(loaded.state.seed,s.seed);
 const bad=structuredClone(p);bad.rosters[0].rows[0].pop();assert.throws(()=>expandCareerState(bad));
});
test('旧localStorage名鑑はIDB読戻し照合後のみ除去、3名を保持し再実行は冪等',async()=>{
 const db=libraryOptions(),players=[11,22,33].map(retired),legacy={version:1,careers:players.map(state=>({careerId:state.careerId,state}))};
 db.storage.setItem(CAREER_LIBRARY_KEY,JSON.stringify(legacy));const auto='untouched';db.storage.setItem(AUTOSAVE_KEY,auto);
 assert.equal((await migrateCareerLibrary(db)).ok,true);assert.equal(db.storage.getItem(CAREER_LIBRARY_KEY),null);
 const a=await readCareerLibrary(db);assert.equal(a.careers.length,3);assert.equal(a.error,'');for(const p of players){const saved=a.careers.find(c=>c.careerId===p.careerId).state;assert.deepEqual(saved.afterlife,p.afterlife);assert.deepEqual(saved.records,p.records);assert.deepEqual(saved.player,p.player);}
 assert.equal((await migrateCareerLibrary(db)).ok,true);assert.equal((await readCareerLibrary(db)).careers.length,3);assert.equal(db.storage.getItem(AUTOSAVE_KEY),auto);
});
test('移行先容量不足・旧1名破損では旧保存を削除せず、正常な選手は閲覧可能',async()=>{
 const db=libraryOptions(),a=retired(13),b=retired(14);await readCareerLibrary(db);
 const legacy=JSON.stringify({version:1,careers:[{careerId:a.careerId,state:a}]});db.storage.setItem(CAREER_LIBRARY_KEY,legacy);
 assert.equal((await migrateCareerLibrary({...db,indexedDB:abortingDatabase(db.indexedDB)})).ok,false);assert.equal(db.storage.getItem(CAREER_LIBRARY_KEY),legacy);
 b.player.abilities.meet=NaN;const broken=JSON.stringify({version:1,careers:[{careerId:a.careerId,state:a},{careerId:b.careerId,state:b}]});db.storage.setItem(CAREER_LIBRARY_KEY,broken);
 const r=await readCareerLibrary(db);assert.equal(r.careers.length,1);assert.ok(r.error.includes('破損'));assert.equal(db.storage.getItem(CAREER_LIBRARY_KEY),broken);
});
test('IDB内1名破損でも他2名を読み、同時4件保存は上限3・二重クリックは1名',async()=>{
 const db=libraryOptions(),players=[1,2,3,4].map(retired),results=await Promise.all(players.map(p=>saveRetiredCareer(p,db)));assert.equal(results.filter(r=>r.ok).length,3);
 let lib=await readCareerLibrary(db);assert.equal(lib.careers.length,3);const bad=lib.careers[0].careerId;
 await mutate(db,store=>store.put({careerId:bad,state:{retired:true}}));lib=await readCareerLibrary(db);assert.equal(lib.careers.length,2);assert.equal(lib.storedCount,3);assert.ok(lib.error);
 const other=libraryOptions();const duplicate=await Promise.all([saveRetiredCareer(players[0],other),saveRetiredCareer(players[0],other)]);assert.ok(duplicate.every(r=>r.ok));assert.equal((await readCareerLibrary(other)).careers.length,1);
});
test('寸評は保存前後で同一、成績・Seedを変えず、進行用状態を名鑑へ持ち込まない',()=>{
 const s=retired(1),before=JSON.stringify(s),review=careerReview(s);const a=expandCareerState(createCareerArchiveSnapshot(s));assert.equal(careerReview(a),review);assert.equal(JSON.stringify(s),before);assert.deepEqual(a.periodResults,[]);assert.equal(a.pending,null);assert.equal(a.careerReview,review);assert.deepEqual(careerCardData(a),careerCardData(s));
});
test('広告台帳は128件以内、旧キーは安全移行・広告無効・同キャリア重複なし',async()=>{
 const storage=libraryMemory();storage.setItem('diamond-life.final-career-ad.DL-LEGACY','attempted');let calls=0;const options={storage,adapter:{ready:()=>true,request:()=>calls++}};
 assert.equal(await runNewCareerAd({careerId:'DL-LEGACY',records:[{}]},options),'already-attempted');assert.equal(storage.getItem('diamond-life.final-career-ad.DL-LEGACY'),null);
 const s={careerId:'DL-SAVED',records:[{}],retired:true};await runNewCareerAd(s,options);
 for(let i=0;i<300;i++)await runNewCareerAd({careerId:'DL-'+i,records:[{}]},options);
 assert.ok(JSON.parse(storage.getItem(CAREER_AD_LEDGER_KEY)).length<=MAX_AD_LEDGER_CAREERS);assert.equal(calls,0);assert.equal(storage.length,1);assert.equal(await runFinalCareerAd(s,options),'already-attempted');
});
