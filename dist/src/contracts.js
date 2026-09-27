import {overall} from './growth.js';
import {faService} from './free-agency.js';
import {developmentSalaryModifier} from './development.js';
import {incentiveOffer} from './finance.js';
import {clamp,between,integer,random} from './random.js';
import {avg,era,ops,whip,performance,specialistValue} from './stats.js';
import {money} from './format.js';
export const SALARY_ANCHORS={rookieBreakout:7000,thirdYearStar:12000,fourthYearStar:23000,establishedStar:[25000,60000],development:[240,500],source:'https://www.gurazeni.com/player/1988',reviewed:'2026-09-22'};
// Unit: ten thousand JPY. Historical anchors, not a claim about current market prices.
export const CURRENCY={usdJpy:150};
export const MLB_MINIMUM_USD=780000;
export const SALARY_MODEL={npbFloor:420,developmentFloor:240,npbCap:120000,mlbFloor:MLB_MINIMUM_USD*CURRENCY.usdJpy/10000,mlbCap:600000,geniusChance:1/30,maxAge:50,earlyExperience:[.40,.68,1.0]};
export const SALARY_SOURCES=[
 {label:'グラゼニ.com：2026年推定年俸ランキング',url:'https://www.gurazeni.com/'},
 {label:'グラゼニ.com：牧秀悟の年俸・年度成績（1300→7000→12000→23000万円）',url:'https://www.gurazeni.com/player/1988'},
 {label:'グラゼニ.com：DeNAの支配下・育成の年俸分布',url:'https://www.gurazeni.com/team/6'},
 {label:'日本プロ野球選手会・2026年年俸調査（平均5,216万円、中央値2,000万円）',url:'https://jpbpa.net/2026/04/27/13002/'},
 {label:'日本プロ野球選手会・2025年年俸調査（平均4,905万円、中央値1,900万円）',url:'https://jpbpa.net/2025/04/21/12358/'},
 {label:'MLB公式・山本由伸の12年3億2,500万ドル契約',url:'https://www.mlb.com/news/yoshinobu-yamamoto-dodgers-free-agent-deal'},
 {label:'MLB公式・村上宗隆の2年3,400万ドル契約',url:'https://www.mlb.com/ja/news/munetaka-murakami-white-sox-contract'}
];

// Salary units remain ten thousand JPY. Evaluation never modifies production or player abilities.
export const CONTRACT_RULES={weights:[.55,.30,.15],maxRaise:2.5,raiseStep:1500,cutThreshold:10000,smallRetention:.75,largeRetention:.60,marketPremium:1.25,rehabDays:90,returnDeadline:'07-31',returnRating:60,returnPracticeBatter:12,returnPracticePitcher:6};
export function salaryAssessmentContext(s,record,market=false){
 const prior=(s.records||[]).filter(r=>r!==record&&r.stage===s.stage&&!r.partial&&(record.year===undefined||r.year<record.year));
 return {stats:record.stats,record,age:s.age,stage:s.stage,previousSalary:s.salary,contract:s.activeContract,market,recentSeasons:[...prior.slice(-2),record]};
}
export function seasonSalaryValue(s,r){
 const st=r.stats,pitch=s.player.role==='pitcher',role=r.pitchRole||s.player.pitchRole;
 if(!st?.games)return 0;
 if(pitch){
  const starter=role==='starter',volume=clamp(starter?st.outs/480:st.games/60,0,1.25);
  const quality=clamp(4.5-era(st),-.8,3.5),control=clamp(1.45-whip(st),-.3,.65);
  return Math.max(0,volume*(1600+quality*2200+control*3500)+(st.so||0)*8+(st.wins||0)*65+(st.saves||0)*150+(st.holds||0)*100);
 }
 const volume=clamp(st.ab/480,0,1.25),o=ops(st),quality=Math.max(0,o-.58);
 const field=Math.min(1200,Math.max(0,(st.defenseRuns||0)*70)+Math.max(0,(s.player.abilities.field||50)-50)*12*Math.min(1,st.games/120));
 const specialist=specialistValue(r,s.player.role)*1200;
 let value=volume*(1200+quality*20000+Math.max(0,o-.75)**2*250000)+(st.hr||0)*30+(st.sb||0)*20+(st.rbi||0)*3+field+specialist;
 if(['defense','runner','pinch','pinchAce'].includes(r.batterRole)&&st.ab<200)value=Math.min(value,6000);
 return value;
}
export function calculateSalaryEvaluation(s,record){
 const recent=salaryAssessmentContext(s,record).recentSeasons.slice().reverse(),weights=CONTRACT_RULES.weights.slice(0,recent.length),den=weights.reduce((a,b)=>a+b,0);
 const weighted=recent.reduce((v,r,i)=>v+seasonSalaryValue(s,r)*weights[i]/den,0);
 const pros=(s.records||[]).filter(r=>['pro','mlb'].includes(r.stage)&&!r.partial);
 const regular=pros.filter(r=>s.player.role==='pitcher'?r.stats.outs>=360||r.stats.games>=45:r.stats.ab>=400).length;
 const honors=(s.awards||[]).filter(a=>['最優秀選手（MVP）','ベストナイン','首位打者','本塁打王','最多勝利','最優秀防御率','最多セーブ','最優秀中継ぎ'].includes(a.title)).length;
 const continuity=1+Math.min(.6,regular*.045)+Math.min(.35,honors*.025);
 const reasons=[];
 if(record.stats.games===0)reasons.push('長期離脱・一軍出場なしを考慮');
 else reasons.push(s.player.role==='batter'?'打撃・守備・出場機会を評価':(record.pitchRole||s.player.pitchRole)==='starter'?'先発ローテーションでの貢献を評価':'救援としての登板・勝ちパターンへの貢献を評価');
 if(recent.length>1)reasons.push('直近'+recent.length+'年間の実績を評価');
 if(regular>=5)reasons.push('長年の一軍実績を評価');
 return {target:SALARY_MODEL.npbFloor+weighted*continuity,reasons:reasons.slice(0,3)};
}
export function renewalFloor(previous){return previous*(previous>CONTRACT_RULES.cutThreshold?CONTRACT_RULES.largeRetention:CONTRACT_RULES.smallRetention);}
export function rehabSalary(s,record){
 const rating=overall(s),potential=Math.max(rating,...Object.values(s.player.potential||{}));
 const prior=Math.max(0,...(s.records||[]).filter(r=>r.stage==='pro').slice(-3).map(r=>seasonSalaryValue(s,r)));
 const retention=clamp(.35+prior/60000+Math.max(0,potential-rating)/400-(s.health?.daysLeft||0)/4000,.25,.8);
 return Math.max(SALARY_MODEL.developmentFloor,Math.round(Math.max((s.salary||0)*retention,240+Math.max(0,potential-50)*8+Math.min(1200,prior*.08))/10)*10);
}
export function evaluateRehabContract(s,record){
 if(s.stage!=='pro'||(s.health?.daysLeft||0)<CONTRACT_RULES.rehabDays)return null;
 if(s.activeContract?.endYear>s.year)return {decision:'retain',guaranteed:true};
 if(s.contractStatus==='development'&&s.developmentReason==='rehab')return {decision:'retain',reason:'リハビリ継続を評価'};
 const rating=record.overall??overall(s),potential=Math.max(rating,...Object.values(s.player.potential||{}));
 const draft=(s.drafts||[]).findLast(d=>d.team===s.team&&d.rank),recent=(s.records||[]).filter(r=>r.stage==='pro').slice(-3);
 const proven=Math.max(0,...recent.map(r=>seasonSalaryValue(s,r)));
 const prospect=s.age<=28&&(potential>=70||draft?.rank<=3||rating>=60);
 const star=proven>=8500&&s.salary>=8000;
 const poor=recent.length>=2&&recent.every(r=>seasonSalaryValue(s,r)<1000);
 if(s.age>=34&&!prospect&&!star&&rating<50&&poor&&s.health.severe)return {decision:'release',reason:'故障前の低迷と復帰見込みを考慮'};
 const rehab=!star&&s.health.daysLeft>=180&&(prospect||s.health.severe);
 return {decision:rehab?'rehab':'retain',optionalRehab:!star,annual:rehabSalary(s,record),reason:(prospect?'将来性を評価。':'過去実績と復帰見込みを評価。')+s.health.name+'から復帰まで約'+s.health.daysLeft+'日。'};
}
export function salaryEstimate(s,record,market=false){
 const st=record.stats,assessment=calculateSalaryEvaluation(s,record);
 let target=assessment.target*between(s,.94,1.06)*developmentSalaryModifier(s,record,market);
 if(s.stage==='independent')return Math.round(clamp(180+Math.min(1.3,(s.player.role==='pitcher'?st.outs/450:st.ab/480))*220+Math.max(0,performance(st,s.player.role))*35,180,1200)/10)*10;
 if(s.stage==='pro'&&s.contractStatus==='development'){
  if(s.developmentReason==='rehab')return Math.max(240,Math.round(Math.max(s.salary*.85,rehabSalary(s,record))/10)*10);
  return Math.round(clamp(240+(record.levels?.second?.games||st.games||0)*1.5,240,500)/10)*10;
 }
 if(s.stage==='mlb')target=Math.max(SALARY_MODEL.mlbFloor,target*7.5);
 const floor=s.stage==='mlb'?SALARY_MODEL.mlbFloor:SALARY_MODEL.npbFloor,cap=s.stage==='mlb'?SALARY_MODEL.mlbCap:SALARY_MODEL.npbCap;
 if(market)target*=CONTRACT_RULES.marketPremium;
 else {
  target*=1+Math.min(.1,s.clubTrust?.[s.team]||0);
  const previous=Math.max(floor,s.salary||0);
  target=target>=previous?Math.min(target*.6+previous*.4,Math.max(previous*CONTRACT_RULES.maxRaise,previous+CONTRACT_RULES.raiseStep)):target*.45+previous*.55;
  if(s.stage==='pro')target=Math.max(target,renewalFloor(previous));
 }
 if(s.stage==='pro'&&s.player.role==='batter'&&['defense','runner','pinch','pinchAce'].includes(record.batterRole)&&st.ab<200)target=Math.min(target,6000);
 const minimum=!market&&s.stage==='pro'?Math.max(floor,renewalFloor(s.salary||0)):floor;
 return Math.min(cap,Math.max(minimum,Math.round(target/10)*10));
}
export function rookieContractTerms(result,role='batter'){
 if(result.type==='指名なし')return {salary:0,bonus:0,incentive:null};
 if(result.type==='育成')return {salary:Math.round(clamp(240+(result.score-59)*10,240,500)/10)*10,bonus:300,setupAllowance:300,incentive:null};
 const merit=clamp((result.score-70)/25,0,1),rank=result.rank||6;
 const salary=Math.round(clamp(500+(7-rank)*120+merit*380,420,1600)/10)*10;
 const bonus=Math.round(clamp(1200+(7-rank)*1000+merit*2800,1500,10000)/100)*100;
 return {salary,bonus,incentive:rank<=2&&result.score>=82?{stat:role==='pitcher'?'outs':'ab',target:role==='pitcher'?420:440,label:role==='pitcher'?'140投球回':'440打数',amount:Math.round((2500+merit*2500)/100)*100}:null};
}
// Fixed 2026 planning values; amounts are annual equivalents in ten thousand JPY.
export const OVERSEAS_ROOKIE_RULES={minorUsd:30000,earliestPromotionDay:14};
export function overseasRookieTerms(score,rank){
 const minorAnnual=OVERSEAS_ROOKIE_RULES.minorUsd*CURRENCY.usdJpy/10000;
 const bonusUsd=Math.round(clamp((score-45)/55,0,1)**3*5000000+100000);
 return {rank,score,years:1,salary:minorAnnual,bonus:Math.round(bonusUsd*CURRENCY.usdJpy/10000),minorLevel:'A',payScale:{minorAnnual,majorAnnual:SALARY_MODEL.mlbFloor}};
}
export function signOverseasRookie(s,offer){
 const terms={...overseasRookieTerms(offer.score||60,offer.rank),...offer};
 s.overseasContract={version:1,team:s.team,entryYear:s.year,rank:terms.rank,score:terms.score,signingBonus:terms.bonus,minorLevel:terms.minorLevel,status:'minor',legacy:false};
 s.mlbRoster={optionYears:[],outrighted:false,on40:false,status:'minor'};
 setContract(s,terms.payScale.minorAnnual,1,'海外新人契約',null,null,terms.payScale);
 return terms;
}
export function setContract(s,annual,years=1,type='更改',guarantees=null,incentive=null,payScale=null){
 years=Math.max(1,Math.min(years,SALARY_MODEL.maxAge-s.age+1));
 if(s.stage==='pro')annual=Math.max(s.contractStatus==='development'?SALARY_MODEL.developmentFloor:SALARY_MODEL.npbFloor,annual);
 if(s.stage==='mlb'){if(payScale){payScale={...payScale,majorAnnual:Math.max(SALARY_MODEL.mlbFloor,payScale.majorAnnual)};annual=s.mlbRoster?.status==='major'||s.mlbRoster?.status?.startsWith('il')?payScale.majorAnnual:payScale.minorAnnual;}else annual=Math.max(SALARY_MODEL.mlbFloor,annual);}
 s.salary=annual;s.activeContract={team:s.team,startYear:s.year,endYear:s.year+years-1,years,annual,type,guarantees,incentive,...(payScale?{payScale}: {})};s.contractOffers=[];
}
export function prepareRenewal(s,record){
 if(s.age>=SALARY_MODEL.maxAge)return;
 const active=s.activeContract;
 if(active&&active.endYear>s.year){s.salary=active.annual;s.contracts.push({year:s.year,team:s.team,salary:record.salary,nextSalary:s.salary,roster:record.roster,yearsLeft:active.endYear-s.year});s.news.push('複数年契約は残り'+(active.endYear-s.year)+'年。来季も年俸'+money(s.salary)+'。');return;}
 let annual=salaryEstimate(s,record);const payScale=s.stage==='mlb'?active?.payScale:null;if(payScale)annual=s.mlbRoster?.status==='major'||s.mlbRoster?.status?.startsWith('il')?Math.max(payScale.majorAnnual,annual):payScale.minorAnnual;const reasons=calculateSalaryEvaluation(s,record).reasons;
 s.contracts.push({year:s.year,team:s.team,salary:record.salary,nextSalary:annual,roster:record.roster,yearsLeft:0});
 if(s.stage==='independent'){s.salary=annual;return;}
 const rehab=evaluateRehabContract(s,record);s.rehabReview=rehab?{...rehab,year:s.year}:null;
 s.contractOffers=rehab?.decision==='release'?[]:[{id:'one',annual,years:1,year:s.year+1,...(payScale?{payScale:{...payScale,majorAnnual:Math.max(payScale.majorAnnual,annual)}}:{}),reason:reasons.join(' ／ ')}];
 if(rehab?.decision==='rehab')s.contractOffers=[];
 const rights=s.stage==='pro'?faService(s):null;
 const veteran=(s.records||[]).filter(r=>r.stage===s.stage&&seasonSalaryValue(s,r)>=4000).length>=3;
 // Keep the pre-existing contract random draws so a pricing change does not reroll unrelated future events.
 let multi=null;
 if(record.overall>=65&&s.age<36&&random(s)<.7){
  const years=record.overall>=85?integer(s,3,s.stage==='mlb'?7:5):integer(s,2,3);
  multi={years,incentive:incentiveOffer(s,annual,years)};
 }
 if(multi&&!rehab&&s.contractStatus!=='development'&&(veteran||rights?.domesticDays<=145)){
  const pay=Math.max(s.stage==='pro'?Math.max(SALARY_MODEL.npbFloor,renewalFloor(s.salary)):SALARY_MODEL.mlbFloor,Math.round(annual*.92/10)*10);
  s.contractOffers.push({id:'multi',annual:pay,years:Math.min(multi.years,SALARY_MODEL.maxAge-s.age),year:s.year+1,reason:'継続的な主力実績と長期構想を評価',incentive:multi.incentive});
 }
 if(rehab&&(rehab.decision==='rehab'||rehab.optionalRehab)){
  s.contractOffers.push({id:'rehab',annual:rehab.annual,years:1,year:s.year+1,development:true,reason:rehab.reason});
  s.news.push('来季の支配下契約終了と育成再契約を打診。断って他球団を探すこともできます。');
 }
 if(s.contractOffers.length)s.news.push('球団から来季の契約条件が届きました。');
}
export function signRenewal(s,id){
 const o=s.contractOffers.find(x=>x.id===id);if(!o||o.year!==s.year||s.retired||s.employment)throw Error('有効な契約提示がありません。');
 if(o.development){
  s.developmentReason='rehab';s.rehabContract={year:s.year,team:s.team,previousSalary:s.salary,preInjuryOverall:Math.max(overall(s),...(s.records||[]).filter(r=>r.stage==='pro').slice(-3).map(r=>r.overall||0)),injury:s.health?.name};
  s.timeline.push({year:s.year,text:'支配下契約終了（自由契約相当） → '+s.team+'と育成再契約。支度金の再支給なし'});s.contractStatus='development';
 }
 setContract(s,o.annual,o.years,o.development?'育成・リハビリ':'更改',null,o.incentive||null,o.payScale||null);
 const last=s.contracts.at(-1);if(last){last.nextSalary=s.salary;last.yearsLeft=o.years;}
 s.timeline.push({year:s.year,text:o.years+'年契約に合意。年俸'+money(s.salary)+'・総額'+money(s.salary*o.years)});
}
export function evaluateRosterReturn(s,{date,recovered,farmGames=0,farmStats=null,roll=1}){
 if(s.stage!=='pro'||s.contractStatus!=='development'||!recovered||date.slice(5)>CONTRACT_RULES.returnDeadline)return false;
 const rating=overall(s),potential=Math.max(rating,...Object.values(s.player.potential||{}));
 const minimum=s.player.role==='pitcher'?CONTRACT_RULES.returnPracticePitcher:CONTRACT_RULES.returnPracticeBatter;
 if(rating<CONTRACT_RULES.returnRating||farmGames<minimum)return false;
 const evidence=farmStats?clamp(performance(farmStats,s.player.role),-1,3):0;
 const chance=clamp(.3+(rating-60)*.012+(potential-rating)*.003+(s.age<=28?.08:0)+(s.clubTrust?.[s.team]||0)+evidence*.025,.15,.8);
 return roll<chance;
}
