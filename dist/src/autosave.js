import {DEVELOPMENT_TRAIT_DEFAULTS} from './development.js';
import {validate} from './storage.js';
export const AUTOSAVE_KEY='diamond-life.autosave';
export const AUTOSAVE_VERSION=1;
function checksum(text){let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);}
export function readAutosave(storage){
 try{
  storage??=globalThis.localStorage;
  if(!storage)return {exists:false,state:null,error:'このブラウザではオートセーブを利用できません。'};
  const raw=storage.getItem(AUTOSAVE_KEY);if(raw===null)return {exists:false,state:null,error:''};
  const envelope=JSON.parse(raw);
  if(envelope.version!==AUTOSAVE_VERSION)throw Error('対応していない保存バージョンです。');
  if(typeof envelope.payload!=='string'||envelope.checksum!==checksum(envelope.payload))throw Error('保存データが破損しています。');
  const state=JSON.parse(envelope.payload);
  if(typeof state.careerId!=='string'||!/^DL-[A-Z0-9-]{6,80}$/.test(state.careerId))throw Error('キャリアIDを読み込めません。');
  const migrated=!state.developmentState||Object.keys(DEVELOPMENT_TRAIT_DEFAULTS).some(k=>state.player?.developmentTraits?.[k]==null);
  validate(state);
  const persisted=migrated?writeAutosave(state,storage):{ok:true,error:''};
  return {exists:true,state,error:persisted.error};
 }catch(error){return {exists:true,state:null,error:'保存データを読み込めません。新しい人生を開始できます。'+(error?.message||'')};}
}
export function writeAutosave(state,storage){
 try{
  storage??=globalThis.localStorage;
  if(!storage)throw Error('保存機能を利用できません。');
  const payload=JSON.stringify(state);
  storage.setItem(AUTOSAVE_KEY,JSON.stringify({version:AUTOSAVE_VERSION,savedAt:new Date().toISOString(),checksum:checksum(payload),payload}));
  return {ok:true,error:''};
 }catch(error){return {ok:false,error:'オートセーブに失敗しました。ブラウザの保存設定・空き容量を確認してください。'};}
}
