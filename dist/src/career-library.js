import {DEVELOPMENT_TRAIT_DEFAULTS} from './development.js';
import {validate} from './storage.js';
export const MAX_SAVED_CAREERS=3;
export const CAREER_LIBRARY_KEY='diamond-life.retired-careers';
export const CAREER_LIBRARY_VERSION=1;
// Future entitlement integration belongs here; no purchase state is assumed.
export function savedCareerLimit(){return MAX_SAVED_CAREERS;}
function checkSavedCareer(entry){
 if(!entry?.state?.retired||typeof entry.careerId!=='string'||entry.careerId!==entry.state.careerId||!/^DL-[A-Z0-9-]{6,80}$/.test(entry.careerId))throw Error('保存選手の形式が不正です。');
 validate(entry.state);return entry;
}
export function readCareerLibrary(storage){
 try{
  storage??=globalThis.localStorage;if(!storage)throw Error('ブラウザの保存機能を利用できません。');
  const raw=storage.getItem(CAREER_LIBRARY_KEY);if(raw===null)return {careers:[],error:''};
  const data=JSON.parse(raw);if(data.version!==CAREER_LIBRARY_VERSION||!Array.isArray(data.careers))throw Error('未対応または破損したデータです。');
  const migrated=data.careers.some(c=>!c.state?.developmentState||Object.keys(DEVELOPMENT_TRAIT_DEFAULTS).some(k=>c.state?.player?.developmentTraits?.[k]==null));
  data.careers.forEach(checkSavedCareer);
  if(new Set(data.careers.map(c=>c.careerId)).size!==data.careers.length)throw Error('選手IDが重複しています。');
  if(migrated)storage.setItem(CAREER_LIBRARY_KEY,JSON.stringify(data));
  return {careers:data.careers,error:''};
 }catch(error){return {careers:[],error:'選手名鑑を読み込めません。既存データは変更していません。'+error.message};}
}
export function saveRetiredCareer(state,{replaceId=null,storage,limit=savedCareerLimit()}={}){
 try{
  storage??=globalThis.localStorage;
  const library=readCareerLibrary(storage);if(library.error)return {ok:false,error:library.error};
  const snapshot=JSON.parse(JSON.stringify(state));
  const entry=checkSavedCareer({careerId:snapshot.careerId,savedAt:new Date().toISOString(),state:snapshot});
  if(library.careers.some(c=>c.careerId===entry.careerId))return {ok:true,alreadySaved:true};
  if(!Number.isInteger(limit)||limit<1)throw Error('保存上限の設定が不正です。');
  if(replaceId){const i=library.careers.findIndex(c=>c.careerId===replaceId);if(i<0)throw Error('入れ替える選手が見つかりません。');library.careers[i]=entry;}
  else{if(library.careers.length>=limit)return {ok:false,full:true,error:'保存枠がいっぱいです'};library.careers.push(entry);}
  // One atomic storage write: failed serialization/quota never deletes the old career first.
  storage.setItem(CAREER_LIBRARY_KEY,JSON.stringify({version:CAREER_LIBRARY_VERSION,careers:library.careers}));
  return {ok:true};
 }catch(error){return {ok:false,error:'選手を保存できません。既存データは変更していません。'+error.message};}
}
export function deleteSavedCareer(careerId,storage){
 try{
  storage??=globalThis.localStorage;const library=readCareerLibrary(storage);if(library.error)return {ok:false,error:library.error};
  if(!library.careers.some(c=>c.careerId===careerId))throw Error('選手が見つかりません。');
  storage.setItem(CAREER_LIBRARY_KEY,JSON.stringify({version:CAREER_LIBRARY_VERSION,careers:library.careers.filter(c=>c.careerId!==careerId)}));
  return {ok:true};
 }catch(error){return {ok:false,error:'削除できません。既存データは変更していません。'+error.message};}
}
