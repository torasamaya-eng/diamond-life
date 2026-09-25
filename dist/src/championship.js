import {random} from './random.js';
import {DOMESTIC_LEAGUES,OVERSEAS_LEAGUES,teamName} from './data.js';
// Each team's season is simulated independently; top-three postseason chances are configurable.
export const CHAMPIONSHIP_RULES={seriesChanceByRank:[0,.65,.23,.12,0,0,0],finalWinChance:.5,leagues:DOMESTIC_LEAGUES};
export const OVERSEAS_CHAMPIONSHIP_RULES={leagueWinChanceByRank:[0,.65,.23,.12,0,0,0],worldWinChance:.5,leagues:OVERSEAS_LEAGUES};
export const leagueTeamCount=(team,stage='pro')=>(stage==='mlb'?OVERSEAS_LEAGUES:DOMESTIC_LEAGUES).find(l=>l.teams.includes(teamName(team)))?.teams.length||6;
export function teamSeasonResult(s,r){
 if(!['pro','mlb'].includes(r.stage)||r.partial||r.teamResult)return;
 const overseas=r.stage==='mlb';
 const rules=overseas?OVERSEAS_CHAMPIONSHIP_RULES:CHAMPIONSHIP_RULES;
 const league=rules.leagues.find(l=>l.teams.includes(teamName(r.team)));
 if(overseas){
  const leagueChampion=random(s)<(rules.leagueWinChanceByRank[r.rank]||0);
  const worldChampion=leagueChampion&&random(s)<rules.worldWinChance;
  r.teamResult={region:'overseas',league:league?.name||'海外リーグ',rank:r.rank,leagueChampion,series:leagueChampion,worldChampion,japanChampion:false};
 }else{
  const leagueChampion=r.rank===1;
  const series=random(s)<(rules.seriesChanceByRank[r.rank]||0);
  const japanChampion=series&&random(s)<rules.finalWinChance;
  r.teamResult={region:'domestic',league:league?.name||'国内リーグ',rank:r.rank,leagueChampion,series,japanChampion};
 }
 const text=r.year+'年 '+r.team+'：'+teamResultLabel(r);
 s.news.push(text);s.timeline.push({year:r.year,text});
}
export function teamResultLabel(r){
 const t=r.teamResult;if(!t)return '';
 const overseas=r.stage==='mlb'||t.region==='overseas';
 return t.league+' '+t.rank+'位'+(t.leagueChampion?' / リーグ優勝':'')+(overseas?(t.worldChampion?' / ワールドシリーズ優勝':t.series?' / ワールドシリーズ敗退':''):(t.japanChampion?' / 日本一':t.series?' / 日本シリーズ敗退':''));
}
