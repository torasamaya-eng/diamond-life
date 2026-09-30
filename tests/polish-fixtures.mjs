import {createPlayer} from '../dist/src/engine.js';
import {emptyStats} from '../dist/src/stats.js';
import {TEAMS,OVERSEAS_LEAGUES} from '../dist/src/data.js';
import {setContract} from '../dist/src/contracts.js';
import {prepareRosterDecision} from '../dist/src/roster.js';

export function narrativePlayer(role='batter'){
 const s=createPlayer('寸評 検証',role,71);
 Object.assign(s,{stage:'pro',retired:true,age:35,year:2040,team:TEAMS[0],records:[],teams:[],drafts:[],awards:[],honors:[],timeline:[],injuries:[],developmentHistory:[]});
 Object.assign(s.player,{genius:false,arc:'ordinary'});for(const k in s.player.potential)s.player.potential[k]=70;
 return s;
}
export function addYears(s,n,{stage='pro',age=22,quality='regular',role,year,contractStatus='registered'}={}){
 const start=year??(s.records.at(-1)?.year+1||2026),team=stage==='mlb'?OVERSEAS_LEAGUES[0].teams[0]:TEAMS[0];
 for(let i=0;i<n;i++){
  const stats=s.player.role==='pitcher'?{...emptyStats(),games:25,outs:450,er:67,allowedHits:140,allowedWalks:40,so:120,wins:10}:{...emptyStats(),games:120,ab:450,hits:120,doubles:20,hr:12,bb:35};
  if(quality==='star')Object.assign(stats,s.player.role==='pitcher'?{er:40,so:180}:{hits:155,doubles:30,hr:30,bb:60});
  if(quality==='weak')Object.assign(stats,s.player.role==='pitcher'?{games:8,outs:60,er:15}:{games:35,ab:60,hits:14,hr:1,bb:4,doubles:2});
  if(quality==='none')Object.assign(stats,emptyStats());
  s.records.push({year:start+i,age:age+i,stage,team,salary:1000,contractStatus,stats,batterRole:role||'regular',pitchRole:role||'starter'});
 }
 s.teams.push({year:start,stage,team});s.year=start+n;s.age=age+n;return s;
}
export function narrativeFixtures(){
 const out=[],f=(id,setup,role='batter')=>{const s=narrativePlayer(role);setup(s);out.push({id,state:s});};
 f('legend',s=>{addYears(s,12,{quality:'star'});s.awards=s.records.slice(0,6).map(r=>({year:r.year,team:r.team,title:'MVP'}));});
 f('generationalStar',s=>addYears(s,8,{quality:'star'}));
 f('domesticFace',s=>addYears(s,6,{quality:'star'}));
 f('twoLeagueStar',s=>{addYears(s,3,{quality:'star'});addYears(s,3,{stage:'mlb',age:25,quality:'star'});});
 f('mlbSuccess',s=>{addYears(s,2,{stage:'mlb',quality:'star'});addYears(s,2,{stage:'mlb',age:24});});
 f('mlbFootprint',s=>addYears(s,3,{stage:'mlb'}));
 f('overseasChallenger',s=>addYears(s,2,{stage:'mlb',quality:'weak'}));
 f('overseasComeback',s=>{addYears(s,2);addYears(s,1,{stage:'mlb',age:24,quality:'weak'});addYears(s,2,{age:25});});
 f('schoolElite',s=>{addYears(s,1,{stage:'high',age:17});s.records[0].overall=85;addYears(s,3,{quality:'star'});});
 f('universityBloom',s=>{addYears(s,1,{stage:'university',age:20});s.developmentHistory=[{type:'BREAKOUT',stage:'university',year:s.records[0].year}];addYears(s,3,{quality:'star'});});
 f('overseasCollege',s=>{addYears(s,1,{stage:'overseas',age:21});addYears(s,3,{quality:'star'});});
 f('lateStar',s=>{addYears(s,4,{age:22,quality:'weak'});addYears(s,3,{age:29,quality:'star'});});
 f('steadyStar',s=>addYears(s,5,{quality:'star'}));
 f('lowerDraft',s=>{addYears(s,3);s.domesticEntry={draftYear:s.records[0].year-1};s.drafts=[{year:s.domesticEntry.draftYear,type:'支配下',rank:6,team:s.team}];});
 f('developmentClimber',s=>{addYears(s,3);s.domesticEntry={draftYear:s.records[0].year-1};s.drafts=[{year:s.domesticEntry.draftYear,type:'育成',rank:2,team:s.team}];});
 f('independentClimber',s=>{addYears(s,2,{stage:'independent',age:20});addYears(s,3);});
 f('corporateCraft',s=>{addYears(s,2,{stage:'corporate',age:23});addYears(s,5,{age:25});});
 f('releasedComeback',s=>{addYears(s,2);s.timeline.push({year:s.year,text:'戦力外通告'});addYears(s,2,{stage:'independent',age:24});addYears(s,2,{age:26});});
 f('injuryComeback',s=>{addYears(s,2);s.injuries=[{year:s.year,totalDays:400,severe:true}];addYears(s,2,{quality:'none',age:24});addYears(s,2,{age:26});});
 f('injuryProspect',s=>{s.player.potential.power=95;addYears(s,2,{quality:'weak'});s.injuries=[{year:s.records[0].year,totalDays:400,severe:true}];});
 f('geniusDisappointment',s=>{s.player.genius=true;addYears(s,2,{quality:'weak'});});
 f('proWall',s=>{s.player.arc='lostStar';addYears(s,2,{quality:'weak'});});
 f('briefStar',s=>addYears(s,1,{quality:'star'}));
 f('ironMan',s=>addYears(s,18));
 f('longVeteran',s=>addYears(s,14,{quality:'weak'}));
 f('longRegular',s=>addYears(s,7));
 f('defenseCraft',s=>addYears(s,5,{quality:'weak',role:'defense'}));
 f('pinchRunner',s=>addYears(s,5,{quality:'weak',role:'runner'}));
 f('pinchHitter',s=>addYears(s,5,{quality:'weak',role:'pinchAce'}));
 f('starter',s=>addYears(s,6), 'pitcher');
 f('reliefCraft',s=>{addYears(s,5,{role:'setup'});s.records.forEach(r=>Object.assign(r.stats,{games:50,outs:150,er:23,holds:20}));}, 'pitcher');
 f('closer',s=>{addYears(s,4,{role:'closer'});s.records.forEach(r=>Object.assign(r.stats,{games:55,outs:150,er:20,saves:30}));}, 'pitcher');
 f('marginalPro',s=>addYears(s,2,{quality:'weak'}));
 f('unfulfilledProspect',s=>{s.player.potential.power=95;addYears(s,2,{quality:'weak'});});
 f('solidPro',s=>addYears(s,2));
 f('amateur',s=>addYears(s,3,{stage:'high',age:16}));
 return out;
}
export function rosterPlayer({service=0,priorOutright=false,options=true,seed=71}={}){
 const s=narrativePlayer();Object.assign(s,{stage:'mlb',retired:false,year:2040,age:28,team:OVERSEAS_LEAGUES[0].teams[0],seed});
 for(const k in s.player.abilities)s.player.abilities[k]=50;
 for(let remaining=service;remaining>0;remaining-=172)s.records.push({year:2030+s.records.length,stage:'mlb',team:s.team,mlbServiceDays:Math.min(172,remaining),stats:emptyStats()});
 s.mlbRoster={on40:true,outrighted:priorOutright,optionYears:options?[2033,2034,2035,2036]:[]};setContract(s,1906.5);prepareRosterDecision(s);return s;
}
