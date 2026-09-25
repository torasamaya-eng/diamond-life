import {avg,era,sumStats,performance,obp} from './stats.js';
import {integer,random} from './random.js';
import {POSITIONS,PITCH_ROLES} from './profile.js';
import {CAREER_BALANCE} from './balance.js';

export function retiredNumberEligible(s,team,rows){
 const c=CAREER_BALANCE.retiredNumber,years=rows.filter(r=>r.team===team),st=sumStats(years),pitch=s.player.role==='pitcher';
 if(new Set(years.filter(r=>r.stats.games>0).map(r=>r.year)).size<c.years)return false;
 const awards=(s.awards||[]).filter(a=>a.team===team),major=awards.filter(a=>['首位打者','本塁打王','打点王','最多安打','盗塁王','最高出塁率','最優秀防御率','最多勝利','最多奪三振','最多セーブ','最優秀中継ぎ'].includes(a.title));
 const historical=pitch?st.wins>=c.historicalWins||st.saves>=c.historicalSaves:st.hits>=c.historicalHits&&st.hr>=c.historicalHR;
 const record=(s.recordHistory||[]).some(r=>r.team===team);
 const dominant=pitch?st.wins>=c.wins||st.saves>=c.saves:st.hits>=c.hits||st.hr>=c.hr;
 return dominant&&major.length>=(historical?c.historicalTitles:c.majorTitles)&&(new Set(major.map(a=>a.year)).size>=c.titleYears||historical)&&(awards.some(a=>a.title==='最優秀選手（MVP）')||record||historical);
}
export const ALL_STAR_RULES={voteBase:5000,votesPerMerit:35000,votesPerTitle:45000,multiTitleRecommendation:.97,titleRecommendation:.90,fieldingRecommendation:.80};
export function allStarBallot(s,st,titles=[]){
 const p=s.player,pitch=p.role==='pitcher',merit=Math.max(0,performance(st,p.role));
 const titleCount=Math.min(3,new Set(titles).size),rules=ALL_STAR_RULES;
 const votes=Math.round((rules.voteBase+Math.min(merit,10)*rules.votesPerMerit+titleCount*rules.votesPerTitle+p.abilities.clutch*300)*(.8+random(s)*.4));
 const rivals=Array.from({length:pitch?20:11},()=>integer(s,30000,450000));
 const rank=1+rivals.filter(v=>v>votes).length,fan=rank<=(pitch?3:2);
 const recommendation=titleCount>=2?rules.multiTitleRecommendation:titleCount?titles[0]==='ゴールデングラブ賞'?rules.fieldingRecommendation:rules.titleRecommendation:merit>=4?.60:merit>=3?.35:merit>=2?.15:.03;
 const recommended=random(s)<recommendation;
 const selected=st.games>10&&(fan||recommended);
 return {votes,rank,selected,method:fan?'ファン投票':'監督推薦'};
}
// Annual simulation: completed-season production and awards determine this year's ballot.
export function seasonAwards(s,r){if(!['pro','mlb'].includes(s.stage))return;const st=r.stats,p=s.player,pitch=p.role==='pitcher',titles=[];const regular=pitch?st.outs>=420:st.ab>=440;
 if(!pitch){if(regular&&avg(st)>=.315&&avg(st)>integer(s,315,345)/1000)titles.push('首位打者');if(st.hr>=integer(s,32,48))titles.push('本塁打王');if(st.rbi>=integer(s,95,125))titles.push('打点王');if(st.hits>=integer(s,160,195))titles.push('最多安打');if(st.sb>=integer(s,28,48))titles.push('盗塁王');if(regular&&obp(st)>=.37&&random(s)<.4)titles.push('最高出塁率');}
 else{if(regular&&era(st)<=integer(s,200,280)/100)titles.push('最優秀防御率');if(st.wins>=integer(s,14,19))titles.push('最多勝利');if(st.so>=integer(s,175,230))titles.push('最多奪三振');if(st.saves>=integer(s,32,43))titles.push('最多セーブ');if(st.holds>=integer(s,30,42))titles.push('最優秀中継ぎ');}
 if((pitch?st.outs>=300:st.games>=100)&&performance(st,p.role)>=3&&random(s)<.65)titles.push('ベストナイン');
 if(p.position!=='dh'&&(pitch?st.outs>=330:st.games>=100)&&p.abilities.field>=76&&(pitch?random(s)<.3:(st.defenseRuns||0)>=6))titles.push('ゴールデングラブ賞');
 if(performance(st,p.role)>=6&&random(s)<.6)titles.push('最優秀選手（MVP）');
 if(s.proYears===1&&performance(st,p.role)>=2.5)titles.push('新人王');
 r.awards=titles;for(const title of titles){s.awards.push({year:s.year,title,team:s.team,number:p.number,age:s.age,stats:{...st},position:p.position,pitchRole:p.pitchRole});s.news.push('獲得：'+title+'（'+s.age+'歳）');s.timeline.push({year:s.year,text:title+'を受賞'});}
 const ballot=allStarBallot(s,st,titles);
 const {votes,rank,selected}=ballot;
 const a={year:s.year,age:s.age,team:s.team,number:p.number,position:pitch?PITCH_ROLES[p.pitchRole]:POSITIONS[p.position],...ballot};
 s.allStars.push(a);if(selected){s.news.push('オールスター選出！ '+votes.toLocaleString()+'票・部門'+rank+'位');s.timeline.push({year:s.year,text:'オールスター '+a.method+'で選出（'+votes.toLocaleString()+'票・'+rank+'位）'});}
}
export function legacyHonors(s){if(s.honors?.some(h=>h.title==='名球会入り'))return;const firstDomestic=s.records.find(r=>r.stage==='pro'&&r.stats.games>0)?.year;const rows=s.records.filter(r=>['pro','mlb'].includes(r.stage)&&r.year>=firstDomestic),total=sumStats(rows),pitch=s.player.role==='pitcher';s.honors??=[];const legendary=pitch?total.wins>=200||total.saves>=250:total.hits>=2000;if(!legendary)return;
 s.honors.push({year:s.year,age:s.age,title:'名球会入り',team:'',number:s.player.number});s.news.push('獲得：名球会入り');s.timeline.push({year:s.year,text:'名球会入り。国内プロを起点とする日米通算2000安打／200勝／250セーブを達成'});
 for(const team of new Set(rows.map(r=>r.team))){const years=rows.filter(r=>r.team===team),st=sumStats(years);if(retiredNumberEligible(s,team,rows)){const number=years.at(-1).number??s.player.number;s.honors.push({year:s.year,title:'永久欠番',team,number});s.news.push('獲得：'+team+'の永久欠番 #'+number);s.timeline.push({year:s.year,text:team+'が背番号'+number+'を永久欠番に制定'});}}
}
