import {createPlayer,retire} from '../dist/src/engine.js';
import {setContract} from '../dist/src/contracts.js';
import {simulateDailyRoster} from '../dist/src/roster.js';
import {emptyStats} from '../dist/src/stats.js';
import {TEAMS,OVERSEAS_LEAGUES,CONFIG} from '../dist/src/data.js';
export function longCareer(kind='maximum'){
 const s=createPlayer('長期保存 検証','batter',7701),n=kind==='maximum'?33:kind==='mixed30'?30:20;
 s.player.batterRole='regular';for(const k in s.player.abilities)s.player.abilities[k]=85;
 for(let i=0;i<n;i++){
  s.age=18+i;s.year=CONFIG.startYear+s.age-CONFIG.startAge;s.stage=kind==='MLB20'||kind==='mixed30'&&i>=15?'mlb':'pro';s.team=s.stage==='pro'?TEAMS[0]:OVERSEAS_LEAGUES[0].teams[0];s.grade=i+1;
  if(!s.teams.some(t=>t.stage===s.stage))s.teams.push({year:s.year,stage:s.stage,team:s.team});setContract(s,s.stage==='pro'?5000:20000);
  const roster=simulateDailyRoster(s,.8),stats={...emptyStats(),games:roster.games.first,ab:roster.games.first*3,hits:roster.games.first};
  s.records.push({year:s.year,age:s.age,stage:s.stage,team:s.team,salary:s.salary,stats,levels:{first:stats,second:{...emptyStats(),games:roster.games.second}},dailyRoster:roster,mlbServiceDays:s.stage==='mlb'?roster.service:0});
 }s.proYears=n;retire(s);return s;
}
