import {defenseAt,fielding} from './tools.js';
import {evaluateCareer} from './evaluation.js';
import {CONFIG,BALANCE,TEAMS} from './config.js';
import {random,clamp,round} from './random.js';
import {average,abilityKeys} from './candidates.js';
import {batting,pitching,sum,rates} from './stats.js';
import {playerPicks} from './draft.js';
import {applyLeagueHonors} from './honors.js';
import {createDevelopment,developmentSeason,opportunityFactor,finishDevelopmentSeason,isDevelopingProspect} from './development.js';
function performance(role,s){return role==='投手'?s.outs/3*(5.1-rates(s).era)/40+s.saves*.12+s.holds*.05:s.hits*.027+s.hr*.09+s.sb*.015- s.ab*.006;}
// Legacy approximate honors are not actual awards and must not appear as wins.
export const isRecordedAward=title=>typeof title==='string'&&!title.includes('相当');
export function simulateCareer(c,pick,seed,needs=null,{honors=true,peers=[]}={}){
 const rng=random(`${seed}:career:${c.id}`),h=c.hidden,a={...h.current},rows=[],events=[],injuries=[],titles=[];let team=TEAMS[pick.team],position=c.position,role=c.role==='投手'?'先発':'控え',fatigue=0,poor=0,totalSalary=0,overseas=false,leftWeakness=h.leftSplit,setLoss=h.setLoss,contract=pick.development?'育成':'支配下';
 const add=(age,type,text)=>events.push({age,year:CONFIG.startYear+age-c.age,type,text});
 const progress=['adaptation-v1','adaptation-v2'].includes(h.developmentModel)?createDevelopment(c,pick):null;
 add(c.age,'ENTRY',`${pick.development?'育成':'支配下'}契約で${team}に入団`);
 if(progress&&progress.load>3)add(c.age+1,'ADAPTATION',c.role==='投手'?(h.setLoss>3?'プロの打者への配球と、走者を背負った投球の修正に取り組んだ':'プロの打者への配球・決め球の使い方への対応に取り組んだ'):(h.leftSplit<-3?'左投手の配球やプロの球速への対応に取り組んだ':'プロの球速・配球に対する始動とタイミングの修正に取り組んだ'));
 for(let age=c.age+1;age<=CONFIG.maxAge;age++){
  const year=CONFIG.startYear+age-c.age,years=age-c.age,qualityStart=average(a);
  const injuryChance=(BALANCE.injuryBase+h.injury*BALANCE.injuryRisk+c.medical.length*.015+Math.max(0,age-32)*.007)*(1.08-h.selfCare*.16);
  const hurt=rng.next()<injuryChance?{year,age,part:rng.pick(c.role==='投手'?['肘','肩','腰']:['膝','足首','脇腹']),days:rng.pick([14,28,60,120,240,380])}:null;
  if(hurt){hurt.days=Math.min(hurt.days,380);fatigue=Math.max(fatigue,hurt.days);injuries.push(hurt);add(age,'INJURY',`${hurt.part}の故障・約${hurt.days}日の療養`);if(hurt.days>=240)for(const k of abilityKeys(c.role))a[k]-=rng.int(1,6);}
  const missed=Math.min(210,fatigue),availability=Math.max(0,1-missed/210);fatigue=Math.max(0,fatigue-210);
  const adjustment=progress?developmentSeason(c,progress,{seed,age,years,team,overseas,availability,previous:rows.at(-1),add}):null;
  const late=['late','corporate','independent','college'].includes(h.curve),development=age<h.peakAge?BALANCE.growth*(late?1.12:.86)*Math.max(0,h.potential-average(a))/25*(.55+h.adaptability*.6): -BALANCE.decline*(age-h.peakAge+1)/3;
  const legacyStall=rng.next()<.08+(1-h.adaptability)*.10,stall=adjustment?adjustment.stalled:legacyStall;const breakout=years>1&&age<29&&rng.next()<BALANCE.breakout*h.repair&&!events.some(e=>e.type==='BREAKOUT')&&(!progress||!stall);
  if(stall&&!progress)add(age,'SLUMP','フォームと起用への適応に時間を要した');if(breakout)add(age,'BREAKOUT',c.role==='投手'?'第三球種の精度が上がり、打者一巡後の投球が改善':'始動と打球角度の修正が実戦に定着');
  for(const k of abilityKeys(c.role)){const athletic=['speed','stamina','stuff','arm','field'].includes(k)?1.18:.87;const delta=development>=0?development*(adjustment?adjustment.growth:stall?.18:1)*availability*(.91+(h.personality?.workEthic??.5)*.18):development*athletic; a[k]=clamp(a[k]+delta+(rng.normal()*(1-h.consistency)*.8)+(breakout&&['breaking','control','contact','power'].includes(k)?rng.int(3,7):0),15,98);}
  if(years>1&&rng.next()<BALANCE.repair*h.repair&&(leftWeakness<-3||c.role==='投手'&&setLoss>3)){leftWeakness=Math.min(0,leftWeakness+3);setLoss=Math.max(0,setLoss-2);add(age,'REPAIR',c.role==='投手'?'セット時の下半身の使い方を修正。走者を背負った際の球速差が縮小':'左投手への踏み込みを修正。苦手対戦の内容が改善');}
  const adaptation=adjustment?adjustment.form:years<=2?(h.adaptability-.5)*5+(h.pressure-.5)*(pick.round===1?4:2):0;
  const form=rng.normal()*BALANCE.seasonNoise*(1.3-h.consistency*.6)+adaptation+leftWeakness*.20-(c.role==='投手'&&role==='先発'?setLoss*.3:0),quality=average(a);let opportunity=clamp((quality-39)/35,0,1)*(years===1&&pick.development?.35:1);const tools=defenseAt(c,a,age);
  if(contract==='育成'&&years>1&&opportunity>.25){contract='支配下';add(age,'CONTRACT','二軍での実戦と内容を評価され支配下登録');}
  if(c.role==='投手'){
   if(role!=='先発'&&role!=='抑え'&&a.stuff>=65&&a.control>=62)role='セットアッパー';
   if((a.stamina<54||setLoss>5&&h.repair<.5)&&role==='先発'){role='中継ぎ';add(age,'ROLE','セット投球・持久力を考慮し中継ぎへ転向');}
   if(role!=='先発'&&a.stuff>73&&a.control>57){if(role!=='抑え')add(age,'ROLE','短い回での球威を評価され抑えに定着');role='抑え';}
  }else{
   if(position==='遊撃'&&(age>35||tools.range<52)){position='三塁';add(age,'ROLE','守備負担を調整し遊撃から三塁へ');}
   if(position==='捕手'&&a.field<52){position='一塁';add(age,'ROLE','打撃を生かして捕手から一塁へ');}
   if(position==='三塁'&&age>33&&tools.arm<53){position='一塁';add(age,'ROLE','送球と守備負担を考慮し三塁から一塁へ');}
   if(position==='一塁'&&tools.catching<43&&a.power>63){position='指名打者';add(age,'ROLE','守備負担を減らし指名打者に専念');}
   const bat=a.contact*.5+a.power*.3+a.eye*.2,glove=(tools.range+tools.catching+tools.throwing)/3;
   role=bat>=64||(['遊撃','捕手'].includes(position)&&glove>=73&&bat>=44)?'レギュラー':glove>=70&&position!=='指名打者'?'守備固め':a.speed>=77?'代走':glove>=61&&position!=='一塁'&&position!=='指名打者'?'ユーティリティ':bat>=55||a.power>=72?'代打':'控え';
   opportunity=role==='レギュラー'?clamp(.72+(bat-64)*.008,.7,1):role==='守備固め'?clamp(.42+(glove-70)*.007,.42,.68):role==='ユーティリティ'?.48:role==='代走'?.42:role==='代打'?.32:clamp((bat-25)/105,.12,.35);
  }
  const competition=progress?opportunityFactor(c,progress,{seed,age,years,team,role,position,abilities:a}):null;
  if(competition&&competition.factor<.65&&availability>0&&!events.some(e=>e.type==='COMPETITION'&&e.text.includes(team)))add(age,'COMPETITION',`${team}の${c.role==='投手'?role:position}は一軍枠の競争が厳しく、二軍実戦を交えながら定着を目指した`);
  if(competition)opportunity=clamp(opportunity*competition.factor,0,1);
  const games=contract==='育成'?0:Math.round((c.role==='投手'?(role==='先発'?27:59):143)*opportunity*availability);
  const stat=c.role==='投手'?pitching(a,games,rng,{difficulty:BALANCE.proDifficulty+(overseas?8:0),form,role,ipPerGame:role==='先発'?5.65:1.05}):batting(a,games,rng,{difficulty:BALANCE.proDifficulty+(overseas?8:0),form,paPerGame:role==='レギュラー'?4.1:role==='控え'?2.0:1.1});
  const farmGames=Math.round((c.role==='投手'?20:95)*(contract==='育成'?1:1-opportunity)*availability),farm=c.role==='投手'?pitching(a,farmGames,rng,{difficulty:4,role,ipPerGame:role==='先発'?5:1.2}):batting(a,farmGames,rng,{difficulty:4});
  const defense=c.role==='野手'?fielding(tools,position,games,random(`${seed}:pro-field:${c.id}:${year}`)):null;
  const value=performance(c.role,stat)+(defense?Math.max(-.5,defense.contribution*.16)+games/143*(role==='代走'?.8:role==='ユーティリティ'?.65:0):0),salary=contract==='育成'?240:round(Math.max(440,500+Math.max(0,value)*1100)*(overseas?3:1));totalSalary+=salary;
  const awards=[];
  rows.push({year,age,team,position,positions:role==='ユーティリティ'?[position,position==='遊撃'?'二塁':position==='捕手'?'一塁':position==='中堅'?'右翼':position==='三塁'?'一塁':'三塁']:[position],role,contract,level:overseas?'海外':'国内',salary,stats:stat,farm,defense,injuryDays:missed,awards,value:round(value,2)});
  if(progress){rows.at(-1).development={adaptationLoad:round(progress.load,2),stagnating:progress.stalled,competition:round(competition.competition,2),opportunityFactor:round(competition.factor,3)};finishDevelopmentSeason(c,progress,rows.at(-1),seed,add);}
  poor=value<.7?poor+1:0;
  const developing=isDevelopingProspect(c,rows.at(-1),{years,qualityGain:quality-qualityStart});
  if(years>=3&&poor>=2&&!developing){if(rng.next()<.55){add(age,'RELEASE','出場機会が減り自由契約。他球団で再起を図る');team=rng.pick(TEAMS.filter(t=>t!==team));overseas=false;poor=0;}else{add(age,'RETIRE','契約を得られず現役引退');break;}}
  if(!overseas&&years>=6&&value>5&&h.adaptability+rng.next()>.95){overseas=true;team='ポートランド・スカイラークス';add(age,'MOVE','海外球団へ移籍');}
  if(years>=5&&rng.next()<.025){team=rng.pick(TEAMS.filter(t=>t!==team));overseas=false;add(age,'MOVE',`${team}へ移籍`);}
  if(age>=35&&(quality<55||availability<.4)||age===CONFIG.maxAge){add(age,'RETIRE','体調・出場機会を考慮し現役引退');break;}
 }
 const total=sum(rows.map(r=>r.stats)),farmTotal=sum(rows.map(r=>r.farm)),value=rows.reduce((n,r)=>n+r.value,0),best=rows.reduce((a,b)=>a.value>b.value?a:b);
 const classification=value>=95?'球史に残る名選手':value>=55?'スター':value>=25?'主力':value>=8?'一軍貢献':'一軍定着ならず';
 const expectation=pick.development?6:pick.round===1?32:pick.round===2?22:12;
 const result={id:c.id,name:c.name,role:c.role,pick,rows,total,farmTotal,events,injuries,titles,totalSalary,highestSalary:Math.max(...rows.map(r=>r.salary)),retirementAge:rows.at(-1).age,years:rows.length,classification,value:round(value,2),verdict:value>=expectation*1.8?'期待を大きく超えた':value>=expectation*.75?'期待に応えた':'期待には届かなかった',careerHigh:best.year,answers:[`${c.trend>=1?'直近の計測値は上昇傾向':'直近の計測値は横ばい・低下も含む'}。プロ入り後${rows.filter(r=>r.value>3).length}年で主力級の貢献を記録。`,c.medical.length?`入団前の故障申告${c.medical.length}件。入団後の離脱${injuries.length}件。事前所見だけで結末は確定しない。`:`入団前に大きな故障申告なし。プロでは${injuries.length}件の故障を記録。`,`${c.projection} → 最終起用は${rows.at(-1).position}・${rows.at(-1).role}。`,breakoutText(events)]};
 if(honors)applyLeagueHonors(result,seed,peers);result.evaluation=evaluateCareer(result,c,needs);result.classification=result.evaluation.absolute;result.verdict=result.evaluation.expectation;result.narrative=result.evaluation.narrative;return result;
}
function breakoutText(events){return events.find(e=>e.type==='BREAKOUT')?.text||'継続的な練習・実戦を重ねた。大きな技術転換の記録はなかった。';}
const competitionCache=new WeakMap();
export function careerCompetition(s){
 if(competitionCache.has(s))return competitionCache.get(s);
 const pool=s.picks.map(p=>simulateCareer(s.candidates.find(c=>c.id===p.id),p,s.seed,s.legacyNeeds?null:p.team===s.playerTeam?s.needsAtDraft||s.teamNeeds:s.clubs[p.team].needs,{honors:false}));
 for(const r of pool){applyLeagueHonors(r,s.seed,pool);const c=s.candidates.find(c=>c.id===r.id),needs=s.legacyNeeds?null:r.pick.team===s.playerTeam?s.needsAtDraft||s.teamNeeds:s.clubs[r.pick.team].needs;r.evaluation=evaluateCareer(r,c,needs);r.classification=r.evaluation.absolute;r.verdict=r.evaluation.expectation;r.narrative=r.evaluation.narrative;}
 competitionCache.set(s,pool);return pool;
}
export function sessionCareer(s,id){return careerCompetition(s).find(r=>r.id===id);}
export function revealCareers(s){if(s.results)return s.results;if(s.phase!=='drafted')throw new Error('ドラフト終了後に結果を確認できます');s.results=playerPicks(s).map(p=>sessionCareer(s,p.id));s.phase='results';return s.results;}
