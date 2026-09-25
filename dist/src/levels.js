import {reliefRole,pitchGameFactor} from './profile.js';
import {simulateStats,emptyStats} from './stats.js';
import {clamp,between} from './random.js';
export const FARM_CONFIG={games:120,difficulty:46};
// Domestic first-team stats stay in record.stats for awards, salary and national selection.
export function simulateDomestic(s,firstGames,opportunity,injuryLoss=0){const first=simulateStats(s,firstGames,64+(s.seasonImpact?.year===s.year?s.seasonImpact.difficulty||0:0));const factor=s.player.role==='pitcher'?pitchGameFactor(s):1;const share=clamp(opportunity/(1-injuryLoss||1),0,1);const farmGames=Math.max(0,Math.round(FARM_CONFIG.games*(1-share)*factor*(1-injuryLoss)*between(s,.85,1)));const farmState={...s,player:{...s.player,batterRole:'regular'},simulatingFarm:true};const second=simulateStats(farmState,farmGames,FARM_CONFIG.difficulty);s.seed=farmState.seed;return {first,second};}
export function levelRows(records,level){return records.filter(r=>r.stage==='pro'&&r.levels?.[level]).map(r=>({...r,stats:r.levels[level],team:r.team+' / '+(level==='first'?'一軍':'二軍')}));}

export function rosterFromGames(levels,status='registered'){
 if(status==='development')return '育成・二軍';
 if(!levels)return '所属未判定';
 const first=levels.first?.games||0,second=levels.second?.games||0;
 if(!first&&!second)return '出場なし（療養・調整中）';
 return first>=second?'一軍中心':'二軍中心';
}

export function simulateRegisteredLevels(s,roster){
 const first=simulateStats(s,roster.games.first,(s.stage==='mlb'?78:64)+(s.seasonImpact?.year===s.year?s.seasonImpact.difficulty||0:0));
 const farm={...s,simulatingFarm:true,player:{...s.player,batterRole:'regular'}};
 const second=simulateStats(farm,roster.games.second,s.stage==='mlb'?63:46);s.seed=farm.seed;
 return {first,second};
}
