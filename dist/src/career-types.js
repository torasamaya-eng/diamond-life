import {performance} from './stats.js';
import {CAREER_CLASSIFICATION} from './balance.js';
// Derived labels only: never a creation roll, never changes growth or future outcomes.
export function classifyCareer(s){
 const c=CAREER_CLASSIFICATION,rows=s.records.filter(r=>['pro','mlb'].includes(r.stage)&&!r.partial);
 // Awards also recognize relief pitchers and defensive specialists whose existing
 // generic performance score alone can underestimate a successful season.
 const stars=rows.filter(r=>performance(r.stats,s.player.role)>=c.starMerit||r.awards?.length||s.awards.some(a=>a.year===r.year)),types=[];
 const routes=new Set(s.teams.map(t=>t.stage)),history=s.developmentHistory||[];
 const brokeIn=stage=>history.some(h=>(h.type==='BREAKOUT'||h.kind==='breakout')&&h.stage===stage);
 if(stars.length>=c.starYears&&stars[0].age>=c.lateAge)types.push('遅咲きのスター');
 if(s.records.some(r=>r.stage==='high'&&r.overall>=c.earlyAbility)&&stars.length>=c.starYears)types.push('高校時代からのエリート');
 if(brokeIn('university'))types.push('大学で開花');
 if(routes.has('corporate')&&rows.length)types.push('社会人経由の苦労人');
 if(routes.has('independent')&&s.teams.some((t,i)=>['pro','mlb'].includes(t.stage)&&s.teams.slice(0,i).some(p=>p.stage==='independent')))types.push('独立リーグからの這い上がり');
 if(routes.has('overseas')&&stars.length>=c.starYears)types.push('海外大学経由のスター');
 if(s.injuries?.some(i=>i.severe)&&(s.player.genius||Object.values(s.player.potential).some(v=>v>=90)))types.push('怪我に泣いた大器');
 if(rows.length>=c.ironSeasons&&!s.injuries?.some(i=>i.totalDays>=90))types.push('鉄人');
 if(s.player.genius&&stars.length<c.starYears)types.push('天才型だが伸び悩み');
 if(s.honors?.some(h=>h.title==='名球会入り')&&s.awards.length>=c.legendTitles)types.push('レジェンド');
 return types;
}
