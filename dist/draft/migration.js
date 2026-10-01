import {CONFIG,TEAMS} from './config.js';
import {teamProfile} from './teams.js';
import {initializeTraits,scoutingTools} from './tools.js';
import {evaluateCareer} from './evaluation.js';
// Read-only conversion for v1 names. These names are never used for new games.
const LEGACY=['瀬戸内ブルームズ','北陸スノーフィンズ','信州リッジズ','京葉ライトハウス','南海サンバースト','東都アーケイズ','山陰グリーンロックス','三河アイアンズ','奥羽ウィンターズ','伊勢シーグラス','筑後フレイムズ','常陸レイクス'];
function rename(value){if(typeof value==='string'){for(let i=0;i<LEGACY.length;i++)value=value.replaceAll(LEGACY[i],TEAMS[i]);return value;}if(Array.isArray(value))return value.map(rename);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rename(v)]));return value;}
export function migrateDraft(old){
 const s=rename(structuredClone(old));s.saveVersion=CONFIG.saveVersion;s.config.saveVersion=CONFIG.saveVersion;s.playerTeam=0;
 s.clubs=s.clubs.map((c,i)=>({...teamProfile(s.seed,i),...c,team:TEAMS[i]}));s.teamContext=s.clubs[0].context;s.teamPhilosophy=s.clubs[0].philosophy;
 // Never invent instructions the player had not seen at the time of a completed pick.
 s.legacyNeeds=s.picks.length>0||s.phase!=='scouting';s.teamNeeds=s.legacyNeeds?null:s.clubs[0].needs;
 for(const c of s.candidates){initializeTraits(c,s.seed);c.defenseTools=scoutingTools(c,s.seed);}
 if(s.results)for(const r of s.results){r.evaluation=evaluateCareer(r,s.candidates.find(c=>c.id===r.id),null);r.classification=r.evaluation.absolute;r.verdict=r.evaluation.expectation;r.narrative=r.evaluation.narrative;}
 s.migrationNote=s.legacyNeeds?'旧αの成績と指名は保持しました。当時未提示の補強要求と未記録の守備成績は推測しません。':'旧αを引き継ぎました。担当球団は大阪ブレイバーズです。補強ポイントを確認できます。';return s;
}
