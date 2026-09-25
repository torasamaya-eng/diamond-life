import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';
import {OVERSEAS_LEAGUES} from '../dist/src/data.js';
import {MLB_TEAMS} from '../dist/src/market.js';
import {teamSeasonResult,teamResultLabel,leagueTeamCount} from '../dist/src/championship.js';
import {advanceSeason} from './support.js';
test('海外11球団は2リーグに所属し、リーグ優勝者だけが世界一になれる',()=>{
 assert.equal(new Set(OVERSEAS_LEAGUES.flatMap(l=>l.teams)).size,11);
 assert.equal(MLB_TEAMS.length,11);
 let world=0,leagueOnly=0,lowerWinner=0;
 for(let i=1;i<=250;i++)for(const rank of [1,2,4]){
  const s=createPlayer('海外','batter',i*617),r={year:2031,stage:'mlb',team:MLB_TEAMS[0],rank};
  teamSeasonResult(s,r);
  assert.equal(r.teamResult.japanChampion,false);
  if(r.teamResult.worldChampion){world++;assert.equal(r.teamResult.leagueChampion,true);assert.match(teamResultLabel(r),/ワールドシリーズ優勝/);}
  if(r.teamResult.leagueChampion&&!r.teamResult.worldChampion){leagueOnly++;assert.match(teamResultLabel(r),/ワールドシリーズ敗退/);}
  if(rank===2&&r.teamResult.leagueChampion)lowerWinner++;
  if(rank===4)assert.equal(r.teamResult.leagueChampion,false);
  assert.doesNotMatch(teamResultLabel(r),/日本一|日本シリーズ/);
  const count=s.timeline.length;teamSeasonResult(s,r);assert.equal(s.timeline.length,count);
 }
 assert.ok(world>0&&leagueOnly>0&&lowerWinner>0);
});
test('海外のシーズン進行は所属リーグの球団数内の順位と優勝結果を記録',()=>{
 for(const league of OVERSEAS_LEAGUES)for(let seed=1;seed<=15;seed++){
  const s=createPlayer('海外検証','batter',seed*119);
  Object.assign(s,{year:2031,age:25,stage:'mlb',team:league.teams[0],salary:10000,proYears:1});
  for(const key in s.player.abilities)s.player.abilities[key]=85;
  advanceSeason(s);
  const r=s.records.at(-1);assert.equal(r.stage,'mlb');assert.equal(r.teamResult.league,league.name);
  assert.ok(r.rank>=1&&r.rank<=league.teams.length);assert.equal(leagueTeamCount(r.team,'mlb'),league.teams.length);
 }
});
