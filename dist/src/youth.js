import {overall} from './growth.js';
import {simulateStats,avg,era} from './stats.js';
import {random,pick,clamp} from './random.js';
// Fictional age-group world tournaments. Calendars and selection thresholds are editable.
export const YOUTH_CUPS=[
 {id:'u12',name:'U12世界大会',stage:'elementary',minAge:10,maxAge:12,start:2015,cycle:2,threshold:29,difficulty:34},
 {id:'u15',name:'U15世界大会',stage:'middle',minAge:12,maxAge:15,start:2014,cycle:2,threshold:41,difficulty:46},
 {id:'u18',name:'U18世界大会',stage:'high',minAge:15,maxAge:18,start:2015,cycle:2,threshold:54,difficulty:60}
];
export function youthCalendar(s){return YOUTH_CUPS.filter(c=>c.stage===s.stage&&s.age>=c.minAge&&s.age<=c.maxAge&&s.year>=c.start&&(s.year-c.start)%c.cycle===0);}
export function youthSelection(s,record){for(const cup of youthCalendar(s)){if(s.nationalHistory.some(n=>n.year===s.year&&n.cupId===cup.id))continue;const st=record.stats,ability=overall(s);const performance=s.player.role==='pitcher'?st.outs>=36&&era(st)<3.5:st.ab>=50&&avg(st)>=.3;const chance=clamp(.22+(ability-cup.threshold)*.027+(performance?.2:0),.08,.86);const selected=!s.health?.daysLeft&&st.games>0&&ability>=cup.threshold&&random(s)<chance;const entry={year:s.year,age:s.age,stage:s.stage,cupId:cup.id,name:cup.name,selected,team:cup.name.split('世界')[0]+'日本代表'};if(selected){entry.result=pick(s,['優勝','準優勝','ベスト4','ベスト8']);const games=entry.result==='ベスト8'?4:6;entry.stats=simulateStats(s,s.player.role==='pitcher'?3:games,cup.difficulty);s.scout=clamp(s.scout+(entry.result==='優勝'?7:4),0,99);s.timeline.push({year:s.year,text:cup.name+'日本代表に選出・'+entry.result});s.news.push(cup.name+'日本代表に選出！ 結果：'+entry.result);s.youthNotice={year:s.year,name:cup.name,result:entry.result};}s.nationalHistory.push(entry);}}
