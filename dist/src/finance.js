import {random} from './random.js';
import {money} from './format.js';
export function incomeEntry(s,year,team){s.incomeHistory??=[];let row=s.incomeHistory.find(r=>r.year===year&&(!r.team||r.team===team));if(!row){row={year,team,age:s.age,salary:0,paidSalary:0,incentives:0,signingBonus:0,setupAllowance:0};s.incomeHistory.push(row);}row.team??=team;return row;}
export function careerIncome(s){return (s.totalSalary||0)+(s.totalIncentives||0)+(s.totalSigningBonus||0)+(s.totalSetupAllowance||0);}
export function settleSigningPayment(s,offer){
 if(!['pro','mlb'].includes(s.stage))return;s.signingPayments??=[];
 const key=s.year+':'+s.team;if(s.signingPayments.some(p=>p.key===key))return;
 const development=offer.type==='育成',amount=Math.max(0,offer.bonus||0),kind=development?'setupAllowance':'signingBonus';
 s.signingPayments.push({key,year:s.year,team:s.team,kind,amount});
 const row=incomeEntry(s,s.year,s.team);row[kind]=amount;
 if(development)s.totalSetupAllowance=(s.totalSetupAllowance||0)+amount;else s.totalSigningBonus=(s.totalSigningBonus||0)+amount;
}
export function settleIncome(s,r){
 s.totalIncentives??=0;if(!['pro','mlb','independent'].includes(s.stage))return;
 const row=incomeEntry(s,r.year,r.team||s.team),previous=row.incentives||0,incentive=s.activeContract?.incentive,value=incentive?(r.stats[incentive.stat]||0):0;
 r.incentiveIncome=incentive&&value>=incentive.target?incentive.amount:0;
 s.totalIncentives+=r.incentiveIncome-previous;
 Object.assign(row,{age:r.age,salary:r.salary,firstTeamAllowance:r.firstTeamAllowance||0,paidSalary:r.paidSalary??r.salary,incentives:r.incentiveIncome});
 r.signingBonus=row.signingBonus||0;r.setupAllowance=row.setupAllowance||0;
 if(r.incentiveIncome&&r.incentiveIncome!==previous)s.news.push('獲得：出来高 '+money(r.incentiveIncome)+'（'+incentive.label+'達成）');
}
export function incentiveOffer(s,annual,years){if(years<2||random(s)>.45)return null;const pitcher=s.player.role==='pitcher';const stat=pitcher?(s.player.pitchRole==='starter'?'outs':'games'):'ab';const target=pitcher?(stat==='outs'?420:45):440;return {stat,target,label:stat==='outs'?'140投球回':stat==='games'?'45登板':'440打数',amount:Math.max(100,Math.round(annual*.15/10)*10)};}


export const FIRST_TEAM_PAY={guarantee:1600,fullDays:150};
export function firstTeamAllowance(annual,days,stage='pro',status='registered'){
 if(stage!=='pro'||status==='development'||annual>=FIRST_TEAM_PAY.guarantee)return 0;
 const gap=Math.max(0,FIRST_TEAM_PAY.guarantee-annual),count=Math.max(0,Math.min(FIRST_TEAM_PAY.fullDays,Math.floor(days)));
 return Math.round(gap*10000*count/FIRST_TEAM_PAY.fullDays)/10000;
}
export function settleSalary(s,r){
 if(r.salarySettled)return;
 const scale=s.activeContract?.payScale;
 if(r.stage==='mlb'&&scale){
  const roster=r.dailyRoster,days=roster?.days||[],den=days.length||187;
  const majorDays=days.length?days.filter(d=>d.onActive||d.status?.startsWith('il')).length:Math.min(den,(roster?.counts.active||0)+(roster?.counts.il||0));
  const minorDays=den-majorDays,majorPay=scale.majorAnnual*majorDays/den,minorPay=scale.minorAnnual*minorDays/den;
  r.overseasPay={majorDays,minorDays,majorAnnual:scale.majorAnnual,minorAnnual:scale.minorAnnual,majorPay,minorPay};
  r.salary=Math.round((majorPay+minorPay)*10000)/10000;
 }
 const days=r.dailyRoster?.counts.active??r.firstTeamDays??0;
 r.salaryRegistrationDays=days;
 r.firstTeamAllowance=firstTeamAllowance(r.salary,days,r.stage,r.contractStatus);
 r.paidSalary=Math.round((r.salary+r.firstTeamAllowance)*10000)/10000;
 r.salarySettled=true;
 s.totalSalary=Math.round((s.totalSalary+r.paidSalary)*10000)/10000;
 s.totalFirstTeamAllowance=Math.round(((s.totalFirstTeamAllowance||0)+r.firstTeamAllowance)*10000)/10000;
 if(r.firstTeamAllowance){s.news.push('一軍登録'+days+'日：追加参稼報酬 '+money(r.firstTeamAllowance)+' ／ 年俸と合わせて '+money(r.paidSalary));}
}
