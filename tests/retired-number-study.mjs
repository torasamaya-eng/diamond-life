import fs from 'node:fs';
import {auditCareer} from './audit-scenarios.mjs';
import {studyRetirement} from './development-study.mjs';
import {sumStats,performance} from '../dist/src/stats.js';
const rows=[];
for(let i=0;i<1000;i++){
 const seed=Math.imul(i+1,2654435761)>>>0,role=i%2?'pitcher':'batter',route=['pro','university','overseas','corporate','independent'][i%5];
 const s=auditCareer(seed,role,route,null,{shouldRetire:studyRetirement});
 if(!s.honors.some(h=>h.title==='名球会入り'))continue;
 const first=s.records.find(r=>r.stage==='pro'&&r.stats.games>0)?.year;
 for(const team of new Set(s.records.filter(r=>['pro','mlb'].includes(r.stage)&&r.year>=first).map(r=>r.team))){
  const rs=s.records.filter(r=>['pro','mlb'].includes(r.stage)&&r.year>=first&&r.team===team),st=sumStats(rs),aw=s.awards.filter(a=>a.team===team);
  const major=aw.filter(a=>['首位打者','本塁打王','打点王','最多安打','盗塁王','最高出塁率','最優秀防御率','最多勝利','最多奪三振','最多セーブ','最優秀中継ぎ'].includes(a.title));
  rows.push({seed,role,team,years:rs.filter(r=>r.stats.games>0).length,hits:st.hits,hr:st.hr,wins:st.wins,saves:st.saves,so:st.so,major:major.length,titleYears:new Set(major.map(a=>a.year)).size,mvp:aw.filter(a=>a.title==='最優秀選手（MVP）').length,best:aw.filter(a=>a.title==='ベストナイン').length,gold:aw.filter(a=>a.title==='ゴールデングラブ賞').length,record:s.recordHistory.some(r=>r.team===team),productive:rs.filter(r=>performance(r.stats,role)>=3).length,retired:s.honors.some(h=>h.title==='永久欠番'&&h.team===team)});
 }
}
fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/retired-number-candidates.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.filter(r=>r.years>=12)));
