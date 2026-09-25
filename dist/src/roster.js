import {majorReady} from './development.js';
import {random,integer,clamp,pick} from './random.js';
import {overall} from './growth.js';
import {pitchGameFactor} from './profile.js';
import {TEAMS,OVERSEAS_LEAGUES} from './data.js';
import {emptyStats} from './stats.js';
import {salaryEstimate} from './contracts.js';
export const ROSTER_RULES={
 npb:{days:183,games:143,farmGames:120,registered:31,bench:29,reserve:70,recall:10,faYear:145},
 mlb:{days:187,games:162,farmGames:150,active:26,september:28,reserve:40,recallBatter:10,recallPitcher:15,options:3,optionDays:20,optionLimit:5,dfaDays:7,ilBatter:10,ilPitcher:15,ilLong:60,serviceYear:172,faYears:6}
};
export const ROSTER_LABELS={major:'メジャー',first:'一軍登録',minor:'マイナー',second:'二軍',injured:'登録抹消・療養',il10:'10日IL',il15:'15日IL',il60:'60日IL',minorInjured:'マイナーで療養'};
export function rosterDate(year,day){return new Date(Date.UTC(year,2,28+day)).toISOString().slice(0,10);}
export function mlbService(s){const years=new Map();for(const r of s.records){if(r.stage!=='mlb')continue;const days=r.mlbServiceDays??0;years.set(r.year,Math.min(172,(years.get(r.year)||0)+days));}return [...years.values()].reduce((a,b)=>a+b,0);}
export function overseasRoster(s){s.mlbRoster??={optionYears:[],outrighted:false,on40:true};return s.mlbRoster;}
export function optionAllowance(s){const used=overseasRoster(s).optionYears.length;const seasons=s.records.filter(r=>r.stage==='mlb'&&r.dailyRoster?.days.filter(d=>d.status==='major'||d.status==='minor').length>=90).length;return used<3?3-used:used===3&&seasons<5?1:0;}
export function prepareRosterDecision(s){
 if(s.stage!=='mlb'||s.retired)return false;if(s.rosterDecision)return true;
 const m=overseasRoster(s);
 if(m.reviewYear===s.year)return false;
 m.reviewYear=s.year;
 if(!m.on40||s.health?.daysLeft>0||overall(s)>=70&&majorReady(s)||s.activeContract?.guarantees?.regular)return false;
 const years=mlbService(s)/172;
 if(years>=5||!optionAllowance(s)){
 s.rosterDecision={year:s.year,type:years>=5?'consent':'dfa',mayElectFA:years>=3||m.outrighted,date:rosterDate(s.year,-7),deadline:rosterDate(s.year,0)};
 return true;
 }return false;
}
export function resolveRosterDecision(s,id){
 const d=s.rosterDecision;if(!d)throw Error('ロースターの打診はありません。');
 const m=overseasRoster(s),from=s.team;
 if(d.type==='consent'&&id==='decline'){s.rosterDecision={...d,type:'refusal',tradeTeam:pick(s,OVERSEAS_LEAGUES.flatMap(l=>l.teams).filter(t=>t!==s.team))};return;}
 if(d.type==='refusal'){if(!['stay','trade','release'].includes(id))throw Error('拒否後の進路を選んでください。');if(id==='stay'||id==='trade'){m.refusedYear=s.year;m.on40=true;if(id==='trade'){s.team=d.tradeTeam;if(s.activeContract)s.activeContract.team=s.team;s.teams.push({year:s.year,stage:'mlb',team:s.team,from});s.moves.push({year:s.year,kind:'trade',from,to:s.team,salary:s.salary});}const text=id==='stay'?'降格拒否後、球団との協議でメジャー残留':'降格拒否後、'+from+'から'+s.team+'へトレード。契約条件は継続';s.news.push(text);s.timeline.push({year:s.year,text});s.rosterDecision=null;return;}id='decline';d.mayElectFA=true;}
 if(!['accept','decline'].includes(id)||id==='decline'&&d.type!=='consent'&&!d.mayElectFA)throw Error('この手続きでは自由契約を選べません。');
 if(id==='decline'&&d.type==='consent'){m.refusedYear=s.year;s.timeline.push({year:s.year,text:'5年以上のメジャー在籍による拒否権を行使。球団はメジャーでの続行を選択'});}
 else if(id==='decline'){
 const last=s.records.at(-1)||{stats:emptyStats(),overall:overall(s)};
 const pricing={...s,stage:'pro',salary:Math.min(s.salary,30000),contractStatus:'registered'};
 const pay=salaryEstimate(pricing,last,true);s.seed=pricing.seed;
 s.employment={year:s.year,type:'released',from,options:[{id:'return',team:pick(s,TEAMS),stage:'pro',role:'player',salary:Math.max(600,pay),years:1},{id:'amateur',team:'東都モータース',stage:'corporate',role:'player',salary:0}]};
 s.team='自由契約';s.salary=0;s.activeContract=null;s.contractOffers=[];
 s.timeline.push({year:s.year,text:d.type==='refusal'?'降格拒否後、球団との協議で自由契約':d.deadline+'：DFA後のマイナー配属を拒否して自由契約を選択'});
 }else{
 m.consentYear=s.year;
 if(d.type==='dfa'||!optionAllowance(s)){
  const claimed=random(s)<.2;
  if(claimed){const pool=OVERSEAS_LEAGUES.flatMap(l=>l.teams).filter(t=>t!==s.team);s.team=pick(s,pool);if(s.activeContract)s.activeContract.team=s.team;m.refusedYear=s.year;m.on40=true;s.teams.push({year:s.year,stage:'mlb',team:s.team,from});s.moves.push({year:s.year,kind:'waivers',from,to:s.team,salary:s.salary});s.timeline.push({year:s.year,text:d.deadline+'：DFAから7日以内に'+s.team+'がウェーバー獲得。メジャー登録'});}
  else {m.outrighted=true;m.on40=false;m.outrightYear=s.year;s.timeline.push({year:s.year,text:d.deadline+'：DFAから7日以内にウェーバー通過、40人枠外のマイナー配属に同意'});}
 }else s.timeline.push({year:s.year,text:'マイナーへのオプション配属に同意'});
 }
 s.rosterDecision=null;
}
export function simulateDailyRoster(s,opportunity,injury=null){
 const overseas=s.stage==='mlb',cfg=overseas?ROSTER_RULES.mlb:ROSTER_RULES.npb;
 const m=overseas?overseasRoster(s):null,active=overseas?'major':'first',farm=overseas?'minor':'second';
 const count=cfg.days,firstTarget=clamp(opportunity,0,1);
 const start=injury?.startDay??0,duration=injury?.unavailableDays??Math.ceil((injury?.lost||0)*365);
 const nationalDays=s.seasonImpact?.year===s.year?Math.ceil((s.seasonImpact.loss||0)*count):0;
 
 let status=(s.contractStatus==='development'&&!overseas||overseas&&!m.on40)?farm:random(s)<firstTarget?active:farm;
 if(overseas&&m.refusedYear===s.year)status=active;
 const days=[],transactions=[],counts={active:0,farm:0,il:0,injuryCredit:0,option:0},games={first:0,second:0};
 let recallDay=0,ilUntil=0,demotions=0,optionUsed=false,injuryEligible=false,lastAppearance=-20;
 const prev=s.records.findLast(r=>r.stage===s.stage&&r.year===s.year-1);
 const change=(day,next,reason)=>{if(status===next)return;transactions.push({date:rosterDate(s.year,day),day,from:status,to:next,reason,eligibleDate:next===farm||next==='injured'?rosterDate(s.year,recallDay):null});status=next;};
 const demote=day=>{
  if(!overseas){recallDay=day+10;change(day,farm,'不調・チーム編成による登録抹消');return true;}
  if(m.refusedYear===s.year||mlbService(s)>=860&&m.consentYear!==s.year||demotions>=5||!optionAllowance(s)&&!m.optionYears.includes(s.year))return false;
  recallDay=day+(s.player.role==='pitcher'?15:10);demotions++;change(day,farm,'マイナーへオプション配属');return true;
 };
 if(overseas&&status===farm&&m.on40){status=active;if(!demote(0))status=active;}
 if(overseas&&status===active)m.on40=true;
 transactions.unshift({date:rosterDate(s.year,0),day:0,from:'offseason',to:status,reason:'開幕登録'});
 for(let day=0;day<count;day++){
  const inInjury=duration>0&&day>=start&&day<start+duration;const sick=inInjury||day<nationalDays;const currentEnd=inInjury?Math.max(start+duration,day<nationalDays?nationalDays:0):nationalDays;
  if(sick){
   if(status===active){
    if(overseas){const minimum=currentEnd-day>=60?60:s.player.role==='pitcher'?15:10;ilUntil=Math.max(day+minimum,currentEnd);change(day,'il'+minimum,'故障による負傷者リスト登録');}
    else {injuryEligible=(prev?.firstTeamDays||0)>=145;recallDay=day+10;change(day,'injured','故障による登録抹消');}
   }else if(status===farm){change(day,overseas?'minorInjured':'injured','ファームで療養');}
  }else{
   if(status.startsWith('il')&&day>=ilUntil)change(day,active,'負傷者リストから復帰');
   if(status==='minorInjured')change(day,farm,'マイナーで実戦復帰');
   if(status==='injured'&&day>=recallDay)change(day,farm,'二軍で実戦復帰');
   if(day%14===0||day===recallDay){const desired=random(s)<firstTarget;
    if(status===active&&!desired)demote(day);
    else if(status===farm&&desired&&day>=recallDay&&!(s.stage==='pro'&&s.contractStatus==='development')){
     if(overseas){if(!m.on40){m.outrightYear=null;transactions.push({day,date:rosterDate(s.year,day),from:'outside40',to:'40man',reason:'メジャー契約を選択、40人枠に登録'});}m.on40=true;}
     change(day,active,overseas?'メジャー昇格':'一軍へ出場選手登録');
    }
   }
  }
  const date=rosterDate(s.year,day),expanded=overseas&&date.slice(5)>='09-01';
  const onActive=status===active,onIL=status.startsWith('il'),onFarm=status===farm;
  if(onActive)counts.active++;if(onFarm||status==='minorInjured')counts.farm++;if(onIL)counts.il++;
  if(!overseas&&status==='injured'&&injuryEligible&&counts.injuryCredit<60)counts.injuryCredit++;
  const optional=overseas&&(onFarm||status==='minorInjured')&&m.on40&&m.outrightYear!==s.year;
  if(optional){counts.option++;if(counts.option>=20&&!optionUsed){optionUsed=true;if(!m.optionYears.includes(s.year))m.optionYears.push(s.year);}}
  let played=false,level=null;
  const scheduledFirst=Math.floor((day+1)*cfg.games/count)>Math.floor(day*cfg.games/count);
  const scheduledFarm=Math.floor((day+1)*cfg.farmGames/count)>Math.floor(day*cfg.farmGames/count);
  if(!sick&&(onActive&&scheduledFirst||onFarm&&scheduledFarm)){
   const starter=s.player.role==='pitcher'&&s.player.pitchRole==='starter';
   const chance=s.player.role==='pitcher'?starter?1:pitchGameFactor(s):onFarm?1:s.player.batterRole==='regular'?.96:.7;
   if((!starter||day-lastAppearance>=(overseas?5:6))&&random(s)<chance){played=true;level=onActive?'first':'second';games[level]++;lastAppearance=day;}
  }
  days.push({date,day,status,team:s.team,onActive,on40:overseas?!status.startsWith('il60')&&m.on40:null,service:overseas?(onActive||onIL):onActive,played,level,activeLimit:overseas?expanded?28:26:31,benchLimit:overseas?expanded?28:26:29});
 }
 if(overseas&&counts.option<20)for(const d of days)if((d.status==='minor'||d.status==='minorInjured')&&d.on40)d.service=true;
 const service=overseas?Math.min(172,counts.active+counts.il+(counts.option<20?counts.option:0)):Math.min(145,counts.active+counts.injuryCredit);
 if(overseas){m.status=status;m.seasonDemotions=demotions;}
 const result={year:s.year,stage:s.stage,days,transactions,counts,games,service,optionUsed,demotions,finalStatus:status};
 s.rosterHistory??=[];s.rosterHistory.push(result);
 for(const t of transactions)s.timeline.push({year:s.year,text:t.date+'：'+(ROSTER_LABELS[t.to]||t.to)+' ／ '+t.reason});
 return result;
}
