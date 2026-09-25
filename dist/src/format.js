export const MONEY_UNIT='JPY_10000';
export const yenFromMan=n=>Math.round((Number(n)||0)*10000);
export const manFromYen=n=>Math.round(Number(n)||0)/10000;
export const money=n=>formatYen(yenFromMan(n));
export function formatYen(n){const yen=Math.max(0,Math.round(Number(n)||0)),value=Math.floor(yen/10000),remainder=yen%10000,oku=Math.floor(value/10000),man=value%10000;if(remainder)return (oku?oku.toLocaleString()+'億':'')+(man?man.toLocaleString()+'万':'')+remainder.toLocaleString()+'円';return oku?`${oku.toLocaleString()}億${man?man.toLocaleString()+'万':''}円`:`${man.toLocaleString()}万円`;}
export const salaryDifference=(before,after)=>`${after>=before?'＋':'−'}${money(Math.abs(after-before))}`;
