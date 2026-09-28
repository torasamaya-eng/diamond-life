import {validate} from './storage.js';
import {createCareerArchiveSnapshot,expandCareerState} from './archive.js';
export const MAX_SAVED_CAREERS=3;
export const CAREER_LIBRARY_KEY='diamond-life.retired-careers';
export const CAREER_LIBRARY_VERSION=2;
export const CAREER_DATABASE='diamond-life.career-library';
export function savedCareerLimit(){return MAX_SAVED_CAREERS;}
function checkSavedCareer(entry){
 const state=expandCareerState(entry?.state);
 if(!state?.retired||typeof entry.careerId!=='string'||entry.careerId!==state.careerId||!/^DL-[A-Z0-9-]{6,80}$/.test(entry.careerId))throw Error('保存選手の形式が不正です。');
 validate(state);return {...entry,state};
}
function libraryDb(factory=globalThis.indexedDB){
 return new Promise((resolve,reject)=>{
  if(!factory){reject(Error('IndexedDBを利用できません。ブラウザの保存設定を確認してください。'));return;}
  const request=factory.open(CAREER_DATABASE,1);let blocked=false;
  request.onupgradeneeded=()=>request.result.createObjectStore('careers',{keyPath:'careerId'});
  request.onerror=()=>reject(request.error);request.onblocked=()=>{blocked=true;reject(Error('別のタブを閉じて再試行してください。'));};
  request.onsuccess=()=>{if(blocked)request.result.close();else resolve(request.result);};
 });
}
async function libraryTransaction(mode,operation,options={}){
 const db=await libraryDb(options.indexedDB);
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('careers',mode),store=tx.objectStore('careers');let result;
  tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error||Error('保存処理を中止しました。'));tx.onerror=()=>{};
  const request=store.getAll();request.onsuccess=()=>{try{result=operation(store,request.result,tx);}catch(error){tx.abort();reject(error);}};
 });}finally{db.close();}
}
export async function migrateCareerLibrary(options={}){
 let raw;
 try{const storage=options.storage??globalThis.localStorage;raw=storage?.getItem(CAREER_LIBRARY_KEY);if(!raw)return {ok:true};
  const data=JSON.parse(raw);if(![1,2].includes(data.version)||!Array.isArray(data.careers))throw Error('旧名鑑の形式が不正です。');
  const valid=[],invalid=[];for(const entry of data.careers){try{const checked=checkSavedCareer(entry);valid.push({...entry,version:CAREER_LIBRARY_VERSION,state:createCareerArchiveSnapshot(checked.state)});}catch{invalid.push(entry?.careerId||'不明');}}
  await libraryTransaction('readwrite',(store,rows)=>{for(const entry of valid)if(!rows.some(r=>r.careerId===entry.careerId))store.put(entry);},options);
  const stored=await libraryTransaction('readonly',(_,rows)=>rows,options);
  for(const entry of valid){const found=stored.find(e=>e.careerId===entry.careerId);checkSavedCareer(found);if(JSON.stringify(found.state)!==JSON.stringify(entry.state))throw Error('旧名鑑との読戻し照合に失敗しました。');}
  if(invalid.length)throw Error('旧名鑑に破損選手があります（'+invalid.join('、')+'）。読める選手は移行し、旧データは保持しました。');
  if(storage.getItem(CAREER_LIBRARY_KEY)===raw)storage.removeItem(CAREER_LIBRARY_KEY);
  return {ok:true};
 }catch(error){return {ok:false,error:'旧名鑑を保持しました。'+error.message};}
}
export async function readCareerLibrary(options={}){
 try{
  const migration=await migrateCareerLibrary(options),rows=await libraryTransaction('readonly',(_,r)=>r,options),careers=[],errors=[];
  for(const row of rows){try{careers.push(checkSavedCareer(row));}catch(error){errors.push((row.careerId||'不明')+'：'+error.message);}}
  return {careers,error:[migration.error,...errors].filter(Boolean).join(' ／ '),storedCount:rows.length};
 }catch(error){return {careers:[],error:'選手名鑑を読み込めません。既存データは変更していません。'+error.message};}
}
export async function saveRetiredCareer(state,{replaceId=null,limit=savedCareerLimit(),...options}={}){
 try{
  if(!Number.isInteger(limit)||limit<1)throw Error('保存上限の設定が不正です。');
  const entry={careerId:state?.careerId,savedAt:new Date().toISOString(),version:CAREER_LIBRARY_VERSION,state:createCareerArchiveSnapshot(state)};checkSavedCareer(entry);
  const migration=await migrateCareerLibrary(options);if(!migration.ok)throw Error(migration.error);
  // One read-write transaction serializes tabs and double taps. Abort rolls back deletion too.
  return await libraryTransaction('readwrite',(store,rows)=>{
   if(rows.some(r=>r.careerId===entry.careerId))return {ok:true,alreadySaved:true};
   if(replaceId){if(!rows.some(r=>r.careerId===replaceId))throw Error('入れ替える選手が見つかりません。');store.delete(replaceId);}
   else if(rows.length>=limit)return {ok:false,full:true,error:'保存枠がいっぱいです'};
   store.put(entry);return {ok:true};
  },options);
 }catch(error){return {ok:false,error:'選手を保存できません。既存データは変更していません。'+error.message};}
}
export async function deleteSavedCareer(careerId,options={}){
 try{
  const migration=await migrateCareerLibrary(options);if(!migration.ok)throw Error(migration.error);
  return await libraryTransaction('readwrite',(store,rows)=>{if(!rows.some(r=>r.careerId===careerId))throw Error('選手が見つかりません。');store.delete(careerId);return {ok:true};},options);
 }catch(error){return {ok:false,error:'削除できません。既存データは変更していません。'+error.message};}
}
