// Independent, read-only assertions against stored payments, never changes game state.
export function moneyIssues(s){
 const out=[],error=(type,path)=>out.push({type,path}),near=(a,b)=>Math.abs(a-b)<.001;
 const totals=['salary','totalSalary','totalSigningBonus','totalSetupAllowance','totalIncentives','totalFirstTeamAllowance'];
 const number=(v,path)=>{if(Number.isNaN(v))error('NaN',path);else if(!Number.isFinite(v))error('Infinity',path);else if(v<0)error('negativeMoney',path);};
 for(const k of totals)if(s[k]!==undefined)number(s[k],k);
 const payments=s.signingPayments||[],seen=new Set();
 for(const p of payments){number(p.amount,'signingPayments');if(seen.has(p.key))error(p.kind==='setupAllowance'?'setupDuplicate':'signingDuplicate',p.key);seen.add(p.key);}
 for(const [total,kind] of [['totalSigningBonus','signingBonus'],['totalSetupAllowance','setupAllowance']])if(!near(s[total]||0,payments.filter(p=>p.kind===kind).reduce((n,p)=>n+p.amount,0)))error(kind==='signingBonus'?'signingDuplicate':'setupDuplicate',total);
 for(const fee of s.postingFees||[]){number(fee.amount,'postingFee');if(fee.playerIncome!==0)error('postingPlayerIncome','postingFees');}
 const c=s.activeContract;if(c){number(c.annual,'contract.annual');if(c.payScale){number(c.payScale.minorAnnual,'minorAnnual');number(c.payScale.majorAnnual,'majorAnnual');}else if(c.schemaVersion>=2&&!near(c.guaranteedTotal,c.annual*c.years))error('contractTotalMismatch','contract');}
 const settled=s.records.filter(r=>r.salarySettled);
 for(const r of settled){for(const k of ['salary','annualSalary','paidSalary','firstTeamAllowance','incentiveIncome'])if(r[k]!==undefined)number(r[k],r.year+'.'+k);
  let base=r.salary;
  if(r.overseasPay){const p=r.overseasPay;const den=p.majorDays+p.minorDays;const ds=r.dailyRoster?.days||[];const minor=ds.length?ds.filter(d=>!d.onActive&&!d.status.startsWith('il')).reduce((n,d)=>n+(d.minorAnnual??p.minorAnnual)/den,0):p.minorAnnual*p.minorDays/den;base=p.majorAnnual*p.majorDays/den+minor;if(!near(p.minorPay,minor)||!near(p.majorPay,p.majorAnnual*p.majorDays/den))error('paidSalaryMismatch',r.year+'.split');}
  if(!near(r.paidSalary,base+(r.firstTeamAllowance||0)))error('paidSalaryMismatch',r.year);
 }
 if(!near(s.totalSalary||0,settled.reduce((n,r)=>n+r.paidSalary,0)))error('paidSalaryMismatch','totalSalary');
 if(!near(s.totalIncentives||0,(s.incomeHistory||[]).reduce((n,r)=>n+(r.incentives||0),0)))error('paidSalaryMismatch','totalIncentives');
 const entered=s.teams?.find(t=>t.stage==='pro')?.year;
 if(entered!==undefined)for(const d of s.drafts||[])if(d.year>=entered&&d.type!=='指名なし')error('formerNpbRedraft',d.year);
 return out;
}
