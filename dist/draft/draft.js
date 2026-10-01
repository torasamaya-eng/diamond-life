import {teamProfile,fitNeeds,philosophyScore} from './teams.js';
import {CONFIG,TEAMS,RECRUITMENT,validateConfig} from './config.js';
import {random,hash} from './random.js';
import {generateCandidates,report,publicScore} from './candidates.js';
import {recruitmentAssessment} from './recruitment.js';
export function eligible(c,round,development=false){return development?c.condition==='制限なし':c.condition!=='2位まで・未指名なら進学／残留'||round<=2;}
export function cpuBoards(candidates,seed,config=CONFIG){
 const visible=candidates.map(report);
 return TEAMS.slice(0,config.teamCount).map((team,i)=>{const rng=random(`${seed}:club:${i}`),profile=teamProfile(seed,i);
  if(config.scoutingModel==='club-v1'){
   const assessments=visible.map(c=>recruitmentAssessment(c,profile,seed));
   return {...profile,need:profile.needs[0].label,selectionModel:'club-v1',assessments,board:[...assessments].sort((a,b)=>b.score-a.score).map(c=>c.id)};
  }
  return {...profile,need:profile.needs[0].label,board:visible.map(c=>({id:c.id,score:publicScore(c)+fitNeeds(c,profile.needs).reduce((n,x)=>n+(x.priority==='最優先'?8:4),0)+philosophyScore(c,profile.philosophy)+rng.normal()*6})).sort((a,b)=>b.score-a.score).map(c=>c.id)};
 });
}
export function createSession(seed,config=CONFIG,playerTeam=0){
 validateConfig(config);const candidates=generateCandidates(seed,config),clubs=cpuBoards(candidates,seed,config),rng=random(`${seed}:declarations`);
 return {saveVersion:CONFIG.saveVersion,adaptiveCPU:true,compareIds:[],reasons:{},id:`draft-${hash(seed).toString(36)}`,seed,config:{...config},candidates,clubs,declarations:clubs.map((c,i)=>i===playerTeam?null:rng.next()<.45?c.board[0]:null),playerTeam,teamContext:clubs[playerTeam]?.context??null,teamNeeds:clubs[playerTeam]?.needs??null,teamPhilosophy:clubs[playerTeam]?.philosophy??null,phase:playerTeam===null?'team-select':'scouting',round:1,picks:[],lotteries:[],news:[],board:{},favorites:[],fallbacks:[],firstPending:Array.from({length:config.teamCount},(_,i)=>i),queue:[],adAttempted:false,results:null};
}
export const available=s=>s.candidates.filter(c=>!s.picks.some(p=>p.id===c.id));
export const playerPicks=s=>s.picks.filter(p=>p.team===s.playerTeam);
export function cpuOrder(s,team){
 const club=s.clubs[team];if(!s.adaptiveCPU)return club.board;
 const acquired=s.picks.filter(p=>p.team===team).map(p=>report(s.candidates.find(c=>c.id===p.id)));
 if(club.selectionModel==='club-v1'&&club.assessments?.length===club.board.length){
  const assessments=new Map(club.assessments.map(a=>[a.id,a]));
  return club.board.map(id=>{
   const c=report(s.candidates.find(c=>c.id===id)),assessment=assessments.get(id);
   const filled=fitNeeds(c,club.needs).reduce((n,need)=>n+(acquired.some(x=>fitNeeds(x,[need]).length)?RECRUITMENT.filledNeedPenalty:0),0);
   const duplicate=acquired.filter(x=>x.position===c.position).length*RECRUITMENT.duplicatePenalty;
   return {id,score:assessment.score-filled-duplicate};
  }).sort((a,b)=>b.score-a.score).map(x=>x.id);
 }
 return club.board.map((id,i)=>{const c=report(s.candidates.find(c=>c.id===id));const filled=fitNeeds(c,club.needs).reduce((n,need)=>n+(acquired.some(x=>fitNeeds(x,[need]).length)?(need.priority==='最優先'?8:4)*1.7:0),0);const duplicate=acquired.filter(x=>x.position===c.position).length*3;return {id,score:-i-filled-duplicate};}).sort((a,b)=>b.score-a.score).map(x=>x.id);
}
function best(s,team,round,development=false){const remaining=new Set(available(s).filter(c=>eligible(c,round,development)).map(c=>c.id));return cpuOrder(s,team).find(id=>remaining.has(id));}
function recordPick(s,team,id,round,development=false){if(!id)throw new Error('指名可能な候補が不足しています');const reason=team===s.playerTeam?s.reasons?.[id]:null;s.picks.push({team,id,round,development,order:s.picks.length+1,...(reason?{reason}:{})});s.news.unshift(`${s.clubs[team].team}：${development?'育成':round+'位'} ${s.candidates.find(c=>c.id===id).name}`);}
export function startDraft(s){if(s.phase!=='scouting')return;s.needsAtDraft=structuredClone(s.teamNeeds);s.phase='first';}
function firstRequests(s,id){const requests=new Map(),round=s.lotteries.length;for(const team of s.firstPending){const declared=round===0?s.declarations[team]:null;const choice=team===s.playerTeam?id:declared&&available(s).some(c=>c.id===declared)?declared:best(s,team,1);if(!requests.has(choice))requests.set(choice,[]);requests.get(choice).push(team);}return requests;}
export function firstCompetition(s,id){if(s.phase!=='first'||!s.firstPending.includes(s.playerTeam)||!available(s).some(c=>c.id===id&&eligible(c,1)))throw Error('1位指名できない選手です');return [...(firstRequests(s,id).get(id)||[])];}
export function chooseFirst(s,id){
 if(s.phase!=='first'||!s.firstPending.includes(s.playerTeam))throw new Error('1位指名の順番ではありません');
 if(!available(s).some(c=>c.id===id&&eligible(c,1)))throw new Error('この選手は指名できません');
 const round=s.lotteries.length,rng=random(`${s.seed}:lottery:${round}`),requests=firstRequests(s,id);
 const losers=[],ballot=[];for(const [candidate,teams] of requests){const winner=rng.pick(teams);recordPick(s,winner,candidate,1);losers.push(...teams.filter(t=>t!==winner));ballot.push({id:candidate,teams,winner});}s.lotteries.push(ballot);s.firstPending=losers;
 // CPU reballots continue immediately once the player has secured a first pick.
 while(s.firstPending.length&&!s.firstPending.includes(s.playerTeam)){
  const claims=new Map();for(const t of s.firstPending){const x=best(s,t,1);if(!claims.has(x))claims.set(x,[]);claims.get(x).push(t);}const next=[],log=[];
  for(const [x,teams] of claims){const winner=rng.pick(teams);recordPick(s,winner,x,1);next.push(...teams.filter(t=>t!==winner));log.push({id:x,teams,winner});}s.lotteries.push(log);s.firstPending=next;
 }
 if(!s.firstPending.length){s.phase='rounds';s.round=2;setQueue(s);advanceCPU(s);}return s;
}
function setQueue(s){const order=Array.from({length:s.config.teamCount},(_,i)=>i);s.queue=s.round%2===0?order.reverse():order;}
function advanceCPU(s){
 while(s.phase==='rounds'){
  if(!s.queue.length){s.round++;if(s.round>s.config.mainDraftRounds+s.config.developmentDraftRounds){s.phase='drafted';s.undrafted=available(s).map(c=>({id:c.id,route:c.category==='高校'?'大学進学を検討':c.category==='大学'?'社会人・独立で再挑戦を検討':'所属先で継続を検討'}));return;}setQueue(s);}
  if(s.queue[0]===s.playerTeam)return;
  const t=s.queue.shift(),development=s.round>s.config.mainDraftRounds;recordPick(s,t,best(s,t,s.round,development),s.round,development);
 }
}
export function pick(s,id){if(s.phase==='first')return chooseFirst(s,id);if(s.phase!=='rounds'||s.queue[0]!==s.playerTeam)throw new Error('指名の順番ではありません');const development=s.round>s.config.mainDraftRounds;if(!available(s).some(c=>c.id===id&&eligible(c,s.round,development)))throw new Error('入団条件に合いません');recordPick(s,s.playerTeam,id,s.round,development);s.queue.shift();advanceCPU(s);return s;}
export function recommended(s){return available(s).filter(c=>eligible(c,s.round,s.round>s.config.mainDraftRounds)).sort((a,b)=>{const preference=c=>s.fallbacks.includes(c.id)?-100+s.fallbacks.indexOf(c.id):s.board[c.id]==='1位'?-50:c.rank;return preference(a)-preference(b);});}
export function finishDraft(s){startDraft(s);while(['first','rounds'].includes(s.phase))pick(s,recommended(s)[0].id);return s;}
export function otherInterest(s,id){return s.clubs.filter((c,i)=>i!==s.playerTeam).map(c=>({team:c.team,rank:c.board.indexOf(id)+1})).sort((a,b)=>a.rank-b.rank).slice(0,3);}

export function selectTeam(s,index){if(s.phase!=='team-select'||!Number.isInteger(index)||index<0||index>=s.clubs.length)throw Error('担当球団を選択してください');s.playerTeam=index;s.teamContext=s.clubs[index].context;s.teamNeeds=s.clubs[index].needs;s.teamPhilosophy=s.clubs[index].philosophy;s.declarations[index]=null;s.phase='team-context';}
export function acceptTeamContext(s){if(s.phase==='team-context')s.phase='scouting';}
