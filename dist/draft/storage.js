import {CONFIG,validateConfig} from './config.js';
import {hash} from './random.js';
import {migrateDraft} from './migration.js';
export const STORAGE_KEY='hakkyu-draft.session';
export function saveSession(state,storage=globalThis.localStorage){try{storage.setItem(STORAGE_KEY,JSON.stringify({version:CONFIG.saveVersion,checksum:hash(JSON.stringify(state)),state}));return '';}catch{return 'この端末に保存できません。画面を閉じると進行が失われる場合があります。';}}
export function loadSession(storage=globalThis.localStorage){try{
 const raw=storage.getItem(STORAGE_KEY);if(!raw)return {state:null,error:''};const data=JSON.parse(raw);let s=data.state;
 if(![1,CONFIG.saveVersion].includes(data.version)||!s||!s.config||data.checksum!==hash(JSON.stringify(s)))throw Error();validateConfig(s.config);
 if(!['candidates','clubs','picks','declarations','favorites','fallbacks','firstPending','queue','news','lotteries'].every(k=>Array.isArray(s[k]))||!s.board||!['team-select','team-context','scouting','first','rounds','drafted','results'].includes(s.phase)||s.candidates.length!==s.config.candidatePoolSize||s.clubs.length!==s.config.teamCount)throw Error();
 if(s.candidates.some(c=>!c.id||!c.name||!c.hidden?.current||!c.history?.length||!Array.isArray(c.medical)||c.history.some(y=>!y.stats||!y.splits||!y.situations))||s.clubs.some(c=>!Array.isArray(c.board)))throw Error();
 if(new Set(s.candidates.map(c=>c.id)).size!==s.candidates.length||new Set(s.picks.map(p=>p.id)).size!==s.picks.length||s.picks.some(p=>!s.candidates.some(c=>c.id===p.id)))throw Error();
 if(s.phase==='results'&&(!Array.isArray(s.results)||s.results.length!==s.config.mainDraftRounds+s.config.developmentDraftRounds||s.results.some(r=>!r.rows?.length||!r.total||!r.farmTotal||!Array.isArray(r.events)||!Array.isArray(r.answers))))throw Error();
 if(data.version===1){s=migrateDraft(s);const error=saveSession(s,storage);return {state:s,error:error||s.migrationNote};}
 if(s.phase!=='team-select'&&(!Number.isInteger(s.playerTeam)||s.playerTeam<0||s.playerTeam>=s.config.teamCount))throw Error();
 return {state:s,error:''};
 }catch{return {state:null,error:'白球ドラフトの保存を読み込めません。新しいドラフトを開始できます。白球人生の保存には影響しません。'};}}
export function deleteSession(storage=globalThis.localStorage){try{storage.removeItem(STORAGE_KEY);return '';}catch{return '保存を削除できませんでした。';}}
