import {HONORS,TEAMS,LEAGUES,BALANCE} from './config.js';
import {random,clamp} from './random.js';
import {batting,pitching,rates} from './stats.js';
import {fielding} from './tools.js';
const cache=new Map();
const peerCache=new WeakMap();
export const leagueOf=row=>row.level==='海外'?'海外リーグ':LEAGUES[TEAMS.indexOf(row.team)<6?0:1];
const pa=s=>s.ab+s.bb+s.hbp+s.sf;
const positionGroup=p=>['左翼','中堅','右翼'].includes(p)?'外野':p;
export function awardScore(e){const s=e.stats,r=rates(s);return e.role==='投手'?s.outs/3*(4.7-r.era)/35+s.so*.007+s.saves*.13+s.holds*.06:s.ab*(r.ops-.55)/25+s.hr*.08+s.sb*.025+(e.defense?.contribution??0)*.22;}
// Existing league players are simulated alongside the actual drafted cohort.
// This independent stream never changes candidate careers or lottery RNG.
export function leagueOpponents(seed,year,league){
 const key=`${seed}:${year}:${league}`;if(cache.has(key))return cache.get(key);
 const rng=random(`${key}:league-roster`),entries=[],positions=['捕手','一塁','二塁','三塁','遊撃','左翼','中堅','右翼','指名打者'];
 for(let club=0;club<6;club++){
  const team=league==='海外リーグ'?`海外球団${club+1}`:TEAMS[club+(league===LEAGUES[1]?6:0)];
  for(let i=0;i<HONORS.backgroundBatters;i++){
   const a=Object.fromEntries(['contact','power','eye','field','arm','speed'].map(k=>[k,clamp(66+rng.normal()*11,35,91)])),games=rng.int(92,143),position=positions[i%positions.length];
   const stats=batting(a,games,rng,{difficulty:BALANCE.proDifficulty+(league==='海外リーグ'?8:0),paPerGame:4.2,form:rng.normal()*4});
   const tools={range:a.field,catching:a.field,throwing:a.field,arm:a.arm,speed:a.speed,blocking:a.field,running:a.speed};
   entries.push({id:`v:${club}:b:${i}`,name:`${team}の既存野手${i+1}`,role:'野手',position,stats,defense:fielding(tools,position,games,rng)});
  }
  const roles=[...Array(HONORS.backgroundStarters).fill('先発'),...Array(HONORS.backgroundRelievers).fill('中継ぎ'),...Array(HONORS.backgroundClosers).fill('抑え')];
  roles.forEach((role,i)=>{const a=Object.fromEntries(['stuff','control','breaking','stamina'].map(k=>[k,clamp(69+rng.normal()*10,40,91)])),stats=pitching(a,role==='先発'?rng.int(21,28):rng.int(42,65),rng,{difficulty:BALANCE.proDifficulty+(league==='海外リーグ'?8:0),role,ipPerGame:role==='先発'?rng.int(54,65)/10:1.05,form:rng.normal()*4});entries.push({id:`v:${club}:p:${i}`,name:`${team}の既存投手${i+1}`,role:'投手',position:role,usage:role,stats});});
 }
 if(cache.size>=180)cache.clear();cache.set(key,entries);return entries;
}
export function rankAwards(entries){
 const won=new Map(entries.map(e=>[e.id,[]])),add=(e,title)=>won.get(e.id).push(title);
 const top=(list,score,title,count=1,ties=false)=>{const sorted=list.filter(e=>Number.isFinite(score(e))).toSorted((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));if(!sorted.length)return;for(const e of sorted.filter((e,i)=>i<count||ties&&Math.abs(score(e)-score(sorted[0]))<1e-12))add(e,title);};
 const bats=entries.filter(e=>e.role==='野手'&&e.stats.games>0),arms=entries.filter(e=>e.role==='投手'&&e.stats.outs>0);
 top(bats.filter(e=>pa(e.stats)>=Math.round(HONORS.games*HONORS.plateAppearancesPerGame)),e=>rates(e.stats).avg,'首位打者',1,true);
 for(const [key,title] of [['hr','本塁打王'],['rbi','打点王'],['sb','盗塁王']])top(bats.filter(e=>e.stats[key]>0),e=>e.stats[key],title,1,true);
 top(arms.filter(e=>e.stats.outs>=HONORS.games*HONORS.inningsPerGame*3),e=>-rates(e.stats).era,'最優秀防御率',1,true);
 for(const [key,title] of [['wins','最多勝'],['so','最多奪三振'],['saves','最多セーブ']])top(arms.filter(e=>e.stats[key]>0),e=>e.stats[key],title,1,true);
 const qualified=bats.filter(e=>e.stats.games>=HONORS.bestNineGames&&pa(e.stats)>=300),pitchQualified=arms.filter(e=>e.stats.outs>=270||e.stats.games>=40);
 for(const position of new Set(qualified.map(e=>positionGroup(e.position)))){
  const group=qualified.filter(e=>positionGroup(e.position)===position);top(group,awardScore,'ベストナイン',position==='外野'?3:1);top(group,awardScore,'オールスター',position==='外野'?6:2);
 }
 top(pitchQualified,awardScore,'ベストナイン');top(pitchQualified.filter(e=>(e.usage??e.position)==='先発'),awardScore,'オールスター',3);top(pitchQualified.filter(e=>(e.usage??e.position)!=='先発'),awardScore,'オールスター',3);
 const fielders=bats.filter(e=>e.position!=='指名打者'&&e.defense?.games>=HONORS.fieldingGames&&e.defense.chances>0);
 for(const position of new Set(fielders.map(e=>positionGroup(e.position))))top(fielders.filter(e=>positionGroup(e.position)===position),e=>e.defense.contribution,'ゴールデングラブ賞',position==='外野'?3:1);
 top([...qualified,...pitchQualified],awardScore,'MVP');return won;
}
export function applyLeagueHonors(career,seed,peers=[]){
 career.titles=[];career.events=career.events.filter(e=>e.type!=='AWARD');
 let groupCache=null;if(peers.some(r=>r.id===career.id)){groupCache=peerCache.get(peers);if(!groupCache){groupCache=new Map();peerCache.set(peers,groupCache);}}
 for(const row of career.rows){
  const league=leagueOf(row),entry={id:career.id,name:career.name,role:career.role,position:row.position,usage:row.role,stats:row.stats,defense:row.defense};
  const key=`${seed}:${row.year}:${league}`;let ranked=groupCache?.get(key);
  if(!ranked){const other=peers.filter(r=>r.id!==career.id).flatMap(r=>r.rows.filter(y=>y.year===row.year&&leagueOf(y)===league).map(y=>({id:r.id,name:r.name,role:r.role,position:y.position,usage:y.role,stats:y.stats,defense:y.defense})));const field=[...leagueOpponents(seed,row.year,league),...other,entry];ranked={awards:rankAwards(field),count:field.length};groupCache?.set(key,ranked);}
  const wins=ranked.awards.get(career.id)||[];row.awards=wins;row.honorDetails={league,comparedPlayers:ranked.count};
  for(const title of wins){career.titles.push({year:row.year,age:row.age,title});career.events.push({year:row.year,age:row.age,type:'AWARD',text:title});}
 }
 career.events.sort((a,b)=>a.year-b.year);career.honorsModel='league-v1';return career;
}
