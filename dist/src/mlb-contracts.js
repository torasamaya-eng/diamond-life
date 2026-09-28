import {performance} from './stats.js';
import {clamp} from './random.js';
import {recognizedForeignSeasons} from './contract-history.js';
// Fixed 2026 CBA, in USD. Game money continues to use ten thousand JPY.
export const MLB_ECONOMY={usdJpy:150,minimum:780000,non40Minor:30000,firstMinor:63600,subsequentMinor:127100,marketCap:70000000,superTwoDays:2*172+134,superTwoPrior:86,poolMin:5440000,poolMax:8034900};
export const usdMoney=usd=>Math.round(usd*MLB_ECONOMY.usdJpy)/10000;
export const moneyUsd=amount=>Math.round(amount*10000/MLB_ECONOMY.usdJpy);
export function overseasServiceDays(s){const seasons=new Map();for(const r of s.records||[])if(r.stage==='mlb')seasons.set(r.year,Math.min(172,(seasons.get(r.year)||0)+(r.mlbServiceDays||0)));return [...seasons.values()].reduce((a,b)=>a+b,0);}
export function mlbPayStage(s){
 const days=overseasServiceDays(s),last=(s.records||[]).findLast(r=>r.stage==='mlb');
 if(s.overseasContract?.marketAccess||days>=1032)return 'freeAgent';
 if(days>=516)return 'arbitration';
 // Fixed service cutoff approximates a league-wide top-22% ranking, not an ability lottery.
 if(days>=MLB_ECONOMY.superTwoDays&&(last?.mlbServiceDays||0)>=86)return 'superTwo';
 return 'preArbitration';
}
export function minorPayTier(s,year=s.year){
 const m=s.mlbRoster||{},history=[...new Set([...(m.majorContractYears||[]),...(s.records||[]).filter(r=>r.stage==='mlb'&&r.dailyRoster?.days?.some(d=>d.on40)).map(r=>r.year)])];
 const priorService=overseasServiceDays(s)>0,priorContract=history.some(y=>y<year);
 if(priorService||priorContract||history.length>1)return 'subsequentMajorContractMinor';
 return m.on40||history.length?'firstMajorContractMinor':'non40Minor';
}
export function minorAnnualRate(s,year=s.year){return usdMoney(MLB_ECONOMY[{non40Minor:'non40Minor',firstMajorContractMinor:'firstMinor',subsequentMajorContractMinor:'subsequentMinor'}[minorPayTier(s,year)]]);}
export function selectMajorContract(s){
 const m=s.mlbRoster;m.majorContractYears??=[];if(!m.majorContractYears.includes(s.year))m.majorContractYears.push(s.year);
 if(s.activeContract?.payScale)s.activeContract.payScale.minorAnnual=Math.max(s.activeContract.payScale.minorAnnual,minorAnnualRate(s));
}
export function mlbSalaryValue(s,record,market=false){
 const rows=[...(s.records||[]).filter(r=>r!==record&&r.stage===s.stage&&!r.partial&&r.year<record.year).slice(-2),record].reverse();
 const weights=[.55,.30,.15],den=weights.slice(0,rows.length).reduce((a,b)=>a+b,0);
 const merit=Math.max(0,rows.reduce((n,r,i)=>n+Math.max(0,performance(r.stats,s.player.role))*weights[i]/den,0));
 const stage=market?'freeAgent':mlbPayStage(s),service=overseasServiceDays(s)/172;
 if(stage==='preArbitration')return usdMoney(MLB_ECONOMY.minimum+Math.min(220000,merit*18000+service*25000));
 const pitch=s.player.role==='pitcher',relief=pitch&&(record.pitchRole||s.player.pitchRole)!=='starter';
 if(stage==='arbitration'||stage==='superTwo'){
  const level=stage==='superTwo'?0:clamp(Math.floor(service)-3,0,2);
  const ceiling=[11500000,20000000,32000000][level];
  const usd=MLB_ECONOMY.minimum+Math.pow(merit/8,1.3)*(ceiling-MLB_ECONOMY.minimum)*(relief?.7:1);
  return usdMoney(clamp(Math.max(usd,moneyUsd(s.salary||0)*.8),MLB_ECONOMY.minimum,ceiling));
 }
 const age=clamp(1-Math.max(0,s.age-30)*.045,.45,1),health=clamp(1-(s.health?.daysLeft||0)/1600,.65,1);
 const honors=(s.awards||[]).filter(a=>a.year>=s.year-3&&/MVP/.test(a.title)).length;
 const usd=(MLB_ECONOMY.minimum+Math.pow(merit/8,1.4)*29000000)*(relief?.7:1)*age*health*(1+Math.min(.25,honors*.08));
 return usdMoney(clamp(usd,MLB_ECONOMY.minimum,MLB_ECONOMY.marketCap));
}
// Approximate round bands from the 2026 official slot table, not fictitious exact pick numbers.
export const DRAFT_SLOT_BANDS=[[2758800,11350600],[1353100,2633100],[762900,1103500],[558400,755300],[421300,553100],[330300,417400],[260300,327700],[218500,258400],[201700,217800],[191900,201500]];
export function rule4Terms(score,round){
 round=Math.max(1,Math.min(20,Math.floor(round||10)));const band=DRAFT_SLOT_BANDS[round-1]||[50000,150000];
 const prospect=clamp((score-45)/55,0,1),slotValueUsd=Math.round((band[0]+(band[1]-band[0])*prospect)/100)*100;
 const signingBonusUsd=Math.round(slotValueUsd*(.85+prospect*.25)/100)*100;
 return {entryKind:'rule4',draftRound:round,slotBandUsd:band,slotValueUsd,signingBonusUsd,slotApproximation:true};
}
export function postingClass(s){return s.age>=25&&recognizedForeignSeasons(s)>=6?'professional':'internationalAmateur';}
export function postingReleaseFee(totalUsd,minor=false,bonusUsd=0){return minor?bonusUsd*.25:Math.min(totalUsd,25000000)*.20+Math.min(Math.max(0,totalUsd-25000000),25000000)*.175+Math.max(0,totalUsd-50000000)*.15;}
export function overseasMarketTerms(s,offer,kind,index=0){
 if(kind==='posting'&&postingClass(s)==='internationalAmateur'){
  // Deterministic available pool bands; no extra game RNG draw or fictitious global pool simulation.
  const ceiling=[MLB_ECONOMY.poolMin,6794700,MLB_ECONOMY.poolMax][index%3];
  const st=s.records?.at(-1)?.stats,merit=Math.max(0,performance(st,s.player.role));
  const signingBonusUsd=Math.round(ceiling*clamp(.20+merit*.055,.2,.95)/100)*100;
  const minorAnnual=usdMoney(MLB_ECONOMY.non40Minor);
  return {...offer,entryKind:'internationalAmateur',years:1,salary:minorAnnual,bonus:usdMoney(signingBonusUsd),signingBonusUsd,bonusPoolUsd:ceiling,payScale:{minorAnnual,majorAnnual:usdMoney(MLB_ECONOMY.minimum)},incentive:null,guarantees:null,role:'マイナー契約・昇格候補',postingFee:usdMoney(postingReleaseFee(0,true,signingBonusUsd))};
 }
 const total=offer.salary*offer.years;
 return {...offer,entryKind:'professional',marketAccess:true,signingBonusUsd:0,guaranteedTotal:total,postingFee:kind==='posting'?usdMoney(postingReleaseFee(moneyUsd(total))):0};
}
