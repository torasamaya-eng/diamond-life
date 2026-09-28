import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,choose,chooseEmployment,advanceYear,retire} from '../dist/src/engine.js';
import {emptyStats} from '../dist/src/stats.js';
import {TEAMS,OVERSEAS_LEAGUES} from '../dist/src/data.js';
import {rookieContractTerms,overseasRookieTerms,signOverseasRookie,setContract,prepareRenewal,signRenewal,salaryEstimate,renewalFloor} from '../dist/src/contracts.js';
import {minorPayTier,minorAnnualRate,selectMajorContract,mlbPayStage,mlbSalaryValue,usdMoney,postingClass,postingReleaseFee,overseasMarketTerms} from '../dist/src/mlb-contracts.js';
import {simulateDailyRoster,mlbService} from '../dist/src/roster.js';
import {settleSigningPayment,settleSalary,settleIncome,careerIncome,firstTeamAllowance} from '../dist/src/finance.js';
import {hasEverSignedNpbContract,corporateReturnEligibility} from '../dist/src/contract-history.js';
import {draft,corporateDraftEligibility} from '../dist/src/draft.js';
import {npbReturnOffers} from '../dist/src/npb-return.js';
import {negotiate,acceptOffer} from '../dist/src/market.js';
import {validate} from '../dist/src/storage.js';
import {moneyIssues} from './money-invariants.mjs';
export function adult(seed=101,stage='pro',role='batter'){
 const s=createPlayer('制度 検証',role,seed);Object.assign(s,{stage,age:26,year:2034,grade:1,team:stage==='mlb'?OVERSEAS_LEAGUES[0].teams[0]:TEAMS[0],salary:1500});
 for(const k in s.player.abilities)s.player.abilities[k]=75;
 s.player.batterRole='regular';s.player.pitchRole='starter';setContract(s,1500);return s;
}
const record=(s,year=s.year)=>({year,age:s.age,stage:s.stage,team:s.team,overall:75,salary:s.salary,stats:{...emptyStats(),games:140,ab:500,hits:155,doubles:30,hr:25,rbi:90,bb:60,outs:510,wins:14,losses:7,so:170,er:60,allowedHits:145,allowedWalks:45}});
test('NPB新人の順位・進路・即戦力度、育成は支度金のみ、支配下復帰で再支給しない',()=>{
 for(const stage of ['high','university','corporate','independent'])for(let rank=1;rank<=6;rank++)for(const score of [65,80,95]){
  const t=rookieContractTerms({type:'支配下',rank,score,stage,age:stage==='high'?18:22});assert.ok(t.salary>=420&&t.salary<=1600);assert.ok(t.bonus>=1500&&t.bonus<=10000);assert.equal(t.setupAllowance,0);assert.ok((t.incentive?.amount||0)<=5000);
 }
 const t=rookieContractTerms({type:'支配下',rank:2,score:95,stage:'university',age:22});assert.equal(t.salary,1200);assert.equal(t.bonus,7000);
 const s=adult(),d={type:'育成',...rookieContractTerms({type:'育成',score:65})};assert.equal(d.bonus,0);assert.equal(d.setupAllowance,300);assert.ok(d.salary<=300);
 settleSigningPayment(s,d);settleSigningPayment(s,d);assert.equal(s.totalSetupAllowance,300);assert.equal(s.totalSigningBonus,0);
 setContract(s,420,1,'支配下復帰');assert.equal(s.totalSetupAllowance,300);assert.deepEqual(moneyIssues(s),[]);
});
test('NPB一軍日割り、減額制限、契約総額、トレード給与維持',()=>{
 assert.equal(firstTeamAllowance(420,150),1180);assert.equal(firstTeamAllowance(420,75),590);assert.equal(firstTeamAllowance(240,183,'pro','development'),0);
 for(const prior of [420,1500,10000,10001,40000]){const s=adult();s.salary=prior;const r=record(s);r.stats=emptyStats();assert.ok(salaryEstimate(s,r)>=renewalFloor(prior));}
 const s=adult();s.records=[record(s)];setContract(s,5000,3);const board=negotiate(s,'trade',true);assert.equal(board.offers[0].salary,5000);acceptOffer(s,board.offers[0].id);assert.equal(s.salary,5000);assert.equal(s.activeContract.guaranteedTotal,15000);
});
test('Rule4契約金は巡別slot近似、8巡目は数十万ドルで給与と別',()=>{
 for(const score of [50,75,99]){const top=overseasRookieTerms(score,1),eighth=overseasRookieTerms(score,8);assert.ok(top.signingBonusUsd>eighth.signingBonusUsd*5);assert.ok(eighth.signingBonusUsd>=180000&&eighth.signingBonusUsd<300000);assert.equal(eighth.salary,450);assert.equal(eighth.entryKind,'rule4');}
 const s=adult(11,'mlb'),o=overseasRookieTerms(80,8);signOverseasRookie(s,o);settleSigningPayment(s,o);settleSigningPayment(s,o);assert.equal(s.totalSalary,0);assert.equal(s.totalSigningBonus,o.bonus);assert.equal(s.mlbRoster.on40,false);
 const roster=simulateDailyRoster(s,0);const r={...record(s),dailyRoster:roster,contractStatus:'registered'};settleSalary(s,r);settleIncome(s,r);s.records.push(r);assert.equal(r.paidSalary,450);assert.equal(s.salary,450);assert.deepEqual(moneyIssues(s),[]);
});
test('40人枠minor初回・翌契約・既存serviceの最低額を維持',()=>{
 const s=adult(21,'mlb');signOverseasRookie(s,overseasRookieTerms(70,6));assert.equal(minorPayTier(s),'non40Minor');s.mlbRoster.on40=true;selectMajorContract(s);assert.equal(minorAnnualRate(s),usdMoney(63600));
 s.year++;setContract(s,450,1,'更改',null,null,{minorAnnual:450,majorAnnual:11700});assert.equal(s.salary,usdMoney(127100));assert.equal(s.activeContract.payScale.minorAnnual,usdMoney(127100));
 s.mlbRoster.on40=false;assert.equal(minorAnnualRate(s),usdMoney(127100));
});
test('split実支給はmajor72日＋minor115日、年俸を上書きせず生涯へ一度精算',()=>{
 const s=adult(11,'mlb');s.mlbRoster={on40:true,optionYears:[],status:'major'};setContract(s,11700,1,'split',null,null,{minorAnnual:954,majorAnnual:11700});
 const r=record(s);r.dailyRoster={days:Array.from({length:187},(_,i)=>({onActive:i<72,status:i<72?'major':'minor',minorAnnual:954})),counts:{active:72}};
 settleSalary(s,r);settleIncome(s,r);s.records.push(r);assert.equal(r.salary,11700);assert.ok(Math.abs(r.paidSalary-(11700*72+954*115)/187)<.0001);const paid=s.totalSalary;settleSalary(s,r);assert.equal(s.totalSalary,paid);assert.deepEqual(moneyIssues(s),[]);
});
test('メジャー昇格は給与・service・optionへ接続、保証契約はminorでも年額維持',()=>{
 const s=adult(2,'mlb');signOverseasRookie(s,overseasRookieTerms(95,1));const roster=simulateDailyRoster(s,1);assert.equal(roster.days[0].status,'minor');assert.ok(roster.counts.active>0);assert.ok(roster.days.find(d=>d.onActive).day>=14);
 const r={...record(s),dailyRoster:roster,mlbServiceDays:roster.service};settleSalary(s,r);s.records.push(r);assert.ok(r.paidSalary>450&&r.paidSalary<11700);assert.equal(mlbService(s),roster.service);
 s.year++;setContract(s,40000,3);const farm=simulateDailyRoster(s,0);const next={...record(s),dailyRoster:farm};settleSalary(s,next);assert.equal(next.paidSalary,40000);assert.equal(s.activeContract.guaranteedTotal,120000);
});
test('MLB serviceでpre-arb・SuperTwo・仲裁・FAを区別、若手好成績だけで市場価格にしない',()=>{
 const s=adult(31,'mlb'),r=record(s);s.salary=11700;
 for(const [seasons,tail,stage] of [[0,0,'preArbitration'],[2,130,'preArbitration'],[2,134,'superTwo'],[3,0,'arbitration'],[5,0,'arbitration'],[6,0,'freeAgent']]){
  s.records=Array.from({length:seasons},(_,i)=>({...r,year:2020+i,mlbServiceDays:172}));if(tail)s.records.push({...r,year:2020+seasons,mlbServiceDays:tail});assert.equal(mlbPayStage(s),stage);const salary=mlbSalaryValue(s,r);assert.ok(salary>=11700);if(stage==='preArbitration')assert.ok(salary<=15000);
 }
 const old=mlbSalaryValue(s,r,true);s.age=41;assert.ok(mlbSalaryValue(s,r,true)<old);
});
test('postingは25歳かつ国内6season、若手poolと球団譲渡金を選手収入に混ぜない',()=>{
 for(const [age,seasons,kind] of [[24,6,'internationalAmateur'],[25,5,'internationalAmateur'],[25,6,'professional'],[30,4,'internationalAmateur']]){const s=adult();s.age=age;s.records=Array.from({length:seasons},(_,i)=>record(s,2020+i));assert.equal(postingClass(s),kind);const o=overseasMarketTerms(s,{salary:300000,years:4},'posting');assert.equal(o.entryKind,kind);if(kind==='internationalAmateur'){assert.ok(o.signingBonusUsd<=o.bonusPoolUsd);assert.equal(o.salary,450);assert.equal(o.years,1);}else assert.equal(o.guaranteedTotal,1200000);}
 assert.equal(postingReleaseFee(25000000),5000000);assert.equal(postingReleaseFee(50000000),9375000);assert.equal(postingReleaseFee(100000000),16875000);assert.equal(postingReleaseFee(0,true,2000000),500000);
 const s=adult();s.age=24;s.records=Array.from({length:5},(_,i)=>record(s,2029+i));s.postingChallenge={team:s.team,status:'achieved'};const b=negotiate(s,'posting',true);acceptOffer(s,b.offers[0].id);assert.equal(s.mlbRoster.on40,false);assert.equal(s.overseasContract.entryKind,'internationalAmateur');assert.equal(careerIncome(s),s.totalSigningBonus);assert.equal(s.postingFees[0].playerIncome,0);
});
test('FAレギュラー保証は最終年も上位登録、負傷除外、満了後は通常競争へ',()=>{
 for(const stage of ['pro','mlb'])for(const role of ['batter','pitcher']){
 const s=adult(41,stage,role);s.mlbRoster={on40:true,optionYears:[]};setContract(s,20000,2,'fa',{regular:true});s.year++;
 assert.equal(simulateDailyRoster(s,0).counts.farm,0);
 const injured=simulateDailyRoster(s,0,{startDay:20,unavailableDays:70});assert.ok(injured.counts.active<150);assert.equal(injured.counts.farm,0);
 s.year++;assert.ok(simulateDailyRoster(s,0).counts.farm>0);
 }
});
test('元NPBは履歴から再ドラフト不可、独立で復帰交渉、契約金を再支給しない',()=>{
 let success=0,miss=0;for(let seed=1;seed<=100;seed++){
 const s=adult(seed*731);s.teams.push({year:2028,stage:'pro',team:s.team});s.records=[record(s,2028)];s.stage='independent';s.team='独立球団';s.records.push({...record(s),stage:'independent',overall:80});assert.ok(hasEverSignedNpbContract(s));assert.throws(()=>draft(s));
 const offers=npbReturnOffers(s);if(!offers.length){miss++;continue;}success++;const oldDrafts=s.drafts.length;s.pending={type:'career',draft:{type:'指名なし',returning:true,returnOffers:offers}};choose(s,'npb-return');assert.equal(s.stage,'pro');assert.equal(s.drafts.length,oldDrafts);assert.equal(s.totalSigningBonus,0);assert.equal(s.totalSetupAllowance,0);assert.equal(s.activeContract.type,'国内プロ復帰契約');
 }assert.ok(success>0&&miss>0);
});
test('元NPB→社会人は登録2season後の復帰、MLBのみ→独立は新人draft対象',()=>{
 const s=adult();s.teams.push({year:2020,stage:'pro',team:s.team});s.stage='corporate';s.grade=1;s.records=[{...record(s),stage:'corporate'}];s.amateurEntry={year:s.year};assert.equal(corporateReturnEligibility(s).eligible,false);assert.equal(npbReturnOffers(s).length,0);s.year++;s.grade++;s.records.push(record(s));assert.equal(corporateReturnEligibility(s).eligible,true);assert.equal(corporateDraftEligibility(s).eligible,false);
 const o=adult(19,'mlb');o.teams=[{year:2020,stage:'mlb',team:o.team}];o.stage='independent';assert.equal(hasEverSignedNpbContract(o),false);assert.doesNotThrow(()=>draft(o));o.stage='corporate';o.grade=1;assert.equal(corporateDraftEligibility(o).eligible,false);o.grade=2;assert.equal(corporateDraftEligibility(o).eligible,true);
});
test('旧保存の金銭履歴を推測変更せず、保留中の元NPB draftのみ復帰へ補完',()=>{
 const s=adult();s.teams.push({year:2020,stage:'pro',team:s.team});s.records=[record(s)];s.stage='independent';s.pending={type:'career',draft:{type:'支配下',rank:1,team:TEAMS[1],salary:1600,bonus:10000}};
 const before=JSON.stringify(s.records),seed=s.seed;validate(s);assert.equal(s.pending.draft.returning,true);assert.equal(s.seed,seed);assert.equal(JSON.stringify(s.records),before);assert.throws(()=>choose(s,'pro'));
 const d=adult();d.pending={type:'career',draft:{type:'育成',bonus:300}};d.activeContract=null;d.stage='high';d.environmentId='mirai';validate(d);assert.equal(d.pending.draft.setupAllowance,300);assert.equal(d.pending.draft.bonus,0);assert.equal(d.totalSetupAllowance,0);
});
test('NPB→MLB→独立／社会人でも復帰契約。低迷・長期故障は自動復帰しない',()=>{
 for(const route of ['independent','corporate']){
  let restored=0;
  for(let seed=1;seed<=40;seed++){
   const s=adult(seed*873);s.records=[record(s,2027),{...record(s,2028),stage:'mlb'}];s.teams.push({year:2027,stage:'pro',team:TEAMS[0]},{year:2028,stage:'mlb',team:'海外球団'});s.stage=route;s.grade=2;s.amateurEntry={year:2033};s.records.push(record(s,2033),record(s,2034));
   assert.throws(()=>draft(s));const offers=npbReturnOffers(s);if(offers.length){s.pending={type:'career',draft:{type:'指名なし',returning:true,returnOffers:offers}};choose(s,'npb-return');assert.equal(s.activeContract.type,'国内プロ復帰契約');assert.equal(s.totalSigningBonus,0);restored++;}
  }assert.ok(restored>0,route);
 }
 const weak=adult();weak.teams.push({year:2020,stage:'pro',team:weak.team});weak.stage='independent';for(const k in weak.player.abilities)weak.player.abilities[k]=30;weak.records=[{...record(weak),stats:emptyStats()}];assert.deepEqual(npbReturnOffers(weak),[]);
});
test('社会人2季の制限は古い直接契約提示からの選択でも迂回できない',()=>{
 const s=adult();s.teams.push({year:2020,stage:'pro',team:s.team});s.stage='corporate';s.amateurEntry={year:s.year};s.records=[record(s)];s.employment={from:'社会人',options:[{id:'return',role:'player',stage:'pro',team:TEAMS[1],salary:1000}]};assert.throws(()=>chooseEmployment(s,'return'),/2季/);assert.equal(s.stage,'corporate');
 s.year++;s.records.push(record(s));chooseEmployment(s,'return');assert.equal(s.stage,'pro');assert.equal(s.totalSigningBonus,0);
});
test('MLB FA・海外FAの通常契約にposting feeはなく、歴史的スターは旧40m上限を超えられる',()=>{
 const s=adult(19,'mlb');s.records=Array.from({length:6},(_,i)=>({...record(s,2028+i),mlbServiceDays:172}));const b=negotiate(s,'mlbFa',true),offer=b.offers.find(o=>o.stage==='mlb');assert.ok(offer);assert.equal(offer.postingFee,0);acceptOffer(s,offer.id);assert.equal(s.overseasContract.marketAccess,true);assert.equal(s.totalSigningBonus,0);
 const star=record(s);star.stats={...star.stats,ab:600,hits:240,doubles:50,hr:65,bb:120,sb:40};for(const prior of s.records.slice(-2))prior.stats={...star.stats};const top=mlbSalaryValue(s,star,true);assert.ok(top>usdMoney(40000000));assert.ok(top<=usdMoney(70000000));
 const n=adult();n.records=Array.from({length:9},(_,i)=>({...record(n,2025+i),faDays:145}));const fa=negotiate(n,'overseasFa',true).offers.find(o=>o.stage==='mlb');assert.equal(fa.postingFee,0);
});
test('旧40人枠minor履歴と保証契約の市場アクセスは過去の収入を変えず導出',()=>{
 const s=adult(22,'mlb');s.mlbRoster={on40:false,optionYears:[],status:'minor'};s.records=[{...record(s,s.year-1),mlbServiceDays:0,dailyRoster:{days:[{on40:true,status:'minor'}]}}];assert.equal(minorAnnualRate(s),usdMoney(127100));
 s.moves=[{year:s.year-2,kind:'posting'}];const before=JSON.stringify(s.records),income=s.totalSalary,seed=s.seed;validate(s);assert.equal(s.overseasContract.marketAccess,true);assert.equal(s.totalSalary,income);assert.equal(s.seed,seed);assert.equal(JSON.stringify(s.records),before);
});
