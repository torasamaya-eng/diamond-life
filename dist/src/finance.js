import {random} from './random.js';
import {money} from './format.js';
export function settleIncome(s,r){s.incomeHistory??=[];s.totalIncentives??=0;if(!['pro','mlb','independent'].includes(s.stage))return;const incentive=s.activeContract?.incentive;const value=incentive?(r.stats[incentive.stat]||0):0;r.incentiveIncome=incentive&&value>=incentive.target?incentive.amount:0;s.totalIncentives+=r.incentiveIncome;s.incomeHistory.push({year:r.year,age:r.age,salary:r.salary,firstTeamAllowance:r.firstTeamAllowance||0,paidSalary:r.paidSalary??r.salary,incentives:r.incentiveIncome});if(r.incentiveIncome)s.news.push('獲得：出来高 '+money(r.incentiveIncome)+'（'+incentive.label+'達成）');}
export function incentiveOffer(s,annual,years){if(years<2||random(s)>.45)return null;const pitcher=s.player.role==='pitcher';const stat=pitcher?(s.player.pitchRole==='starter'?'outs':'games'):'ab';const target=pitcher?(stat==='outs'?420:45):440;return {stat,target,label:stat==='outs'?'140投球回':stat==='games'?'45登板':'440打数',amount:Math.max(100,Math.round(annual*.15/10)*10)};}


export const FIRST_TEAM_PAY={guarantee:1600,fullDays:150};
export function firstTeamAllowance(annual,days,stage='pro',status='registered'){
 if(stage!=='pro'||status==='development'||annual>=FIRST_TEAM_PAY.guarantee)return 0;
 const gap=Math.max(0,FIRST_TEAM_PAY.guarantee-annual),count=Math.max(0,Math.min(FIRST_TEAM_PAY.fullDays,Math.floor(days)));
 return Math.round(gap*10000*count/FIRST_TEAM_PAY.fullDays)/10000;
}
export function settleSalary(s,r){
 if(r.salarySettled)return;
 const days=r.dailyRoster?.counts.active??r.firstTeamDays??0;
 r.salaryRegistrationDays=days;
 r.firstTeamAllowance=firstTeamAllowance(r.salary,days,r.stage,r.contractStatus);
 r.paidSalary=Math.round((r.salary+r.firstTeamAllowance)*10000)/10000;
 r.salarySettled=true;
 s.totalSalary=Math.round((s.totalSalary+r.paidSalary)*10000)/10000;
 s.totalFirstTeamAllowance=Math.round(((s.totalFirstTeamAllowance||0)+r.firstTeamAllowance)*10000)/10000;
 if(r.firstTeamAllowance){s.news.push('一軍登録'+days+'日：追加参稼報酬 '+money(r.firstTeamAllowance)+' ／ 年俸と合わせて '+money(r.paidSalary));}
}
