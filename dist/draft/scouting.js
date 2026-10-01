import {report,scouts} from './candidates.js';
import {rates} from './stats.js';
import {toolLabel} from './tools.js';
export const REASONS=['即戦力','打撃','投球','守備','走塁','将来性','スカウト推薦'];
export function evidence(c){
 const y=c.history.at(-1),st=y.stats,pitch=c.role==='投手',size=pitch?st.outs/3:st.ab;
 const sample=size>=(pitch?60:150)?'十分な実績':size<(pitch?25:80)?'少数試合':'一定の実績';
 const national=c.history.filter(x=>x.national?.stats.games>0),strong=national.reduce((n,x)=>n+(pitch?x.national.stats.outs/3:x.national.stats.ab),0);
 return {sample,volume:pitch?`${Math.floor(st.outs/3)}回${st.outs%3?` ${st.outs%3}/3`:''}`:`${st.ab}打数`,competition:y.league||'対戦水準未記録',strong:strong===0?'強豪相手は未確認':strong<(pitch?20:60)?'強豪対戦は少数':'強豪対戦の記録あり',note:'記録の量と対戦水準を示します。将来の成功率ではありません。'};
}
export function compareCandidates(s){return (s.compareIds||[]).map(id=>s.candidates.find(c=>c.id===id)).filter(Boolean).map(report);}
export function contextualScouts(c){const e=evidence(c);return scouts(c).map((text,i)=>text+' 根拠：'+(i===0?`${e.competition}の${e.volume}と直近の計測。${e.sample}。`:i===1?`${e.strong}。普段の対戦水準との違いも確認する。`:`${c.history.length}年度の体格・計測推移と取材所見。成長の継続を保証する資料ではない。`));}
export function toggleComparison(s,id){
 if(!s.candidates.some(c=>c.id===id))throw Error('候補が見つかりません');
 s.compareIds??=[];if(s.compareIds.includes(id)){s.compareIds=s.compareIds.filter(x=>x!==id);return;}
 if(s.compareIds.length>=3)throw Error('比較は3人までです。1人外してから追加してください。');s.compareIds.push(id);
}
export function setReason(s,id,reason){
 if(!s.candidates.some(c=>c.id===id)||!['scouting','first','rounds'].includes(s.phase)||s.picks.some(p=>p.id===id))throw Error('指名済みの理由は変更できません');
 if(reason&&!REASONS.includes(reason))throw Error('指名理由が不正です');s.reasons??={};s.reasons[id]=reason;
}
export function reasonReview(r){
 const reason=r.pick.reason;if(!reason)return '指名理由の記録なし。後から理由を推測して評価はしません。';
 const rows=r.rows,played=rows.filter(y=>y.stats.games>0),early=rows.slice(0,3),pitch=r.role==='投手';
 let detail='';
 if(reason==='即戦力'){const n=early.filter(y=>pitch?y.stats.outs>=270||y.stats.games>=35:y.stats.ab>=300||y.stats.games>=80).length;detail=n?`最初の3年間で${n}年、一軍の戦力となった。`:'最初の3年間では一軍の継続した戦力には届かなかった。';}
 if(reason==='守備'){const n=rows.filter(y=>y.defense?.games>=40&&y.defense.contribution>0).length;detail=n?`${n}年にわたり守備で一軍に貢献した。`:'一軍で継続した守備貢献を残すには至らなかった。';}
 if(reason==='走塁')detail=`一軍通算${r.total.sb}盗塁。代走として40試合以上起用された年は${rows.filter(y=>y.role==='代走'&&y.stats.games>=40).length}年だった。`;
 if(reason==='打撃'){const n=rows.filter(y=>y.stats.ab>=300&&rates(y.stats).ops>=.74).length;detail=n?`${n}年、まとまった打席で打線を支える成績を残した。`:'一軍で継続して打線を支える打撃成績には届かなかった。';}
 if(reason==='投球')detail=`一軍通算${r.total.wins}勝・${r.total.saves}セーブ・${r.total.holds}ホールド。${r.classification}としてキャリアを終えた。`;
 if(reason==='将来性'){const first=rows.findIndex(y=>pitch?y.stats.outs>=270||y.stats.saves>=20||y.stats.holds>=20:y.stats.ab>=300);detail=first>=0?`${first+1}年目に一軍の主な役割をつかんだ。その後の評価は「${r.classification}」。`:'将来に賭けたが、一軍の主な役割をつかむには至らなかった。';}
 if(reason==='スカウト推薦')detail=`推薦を信じた指名は「${r.verdict}」という結果に。${played.length}年の一軍出場を記録した。`;
 return `${reason}を期待して指名。${detail}`;
}
export function developmentReview(r,c){
 if(!c)return null;const y=c.history.at(-1),pitch=c.role==='投手',best=r.rows.find(row=>row.year===r.careerHigh)||r.rows[0];
 const rows=pitch?[
  ['投球実績',`${Math.floor(y.stats.outs/3)}回 / 防御率${rates(y.stats).era.toFixed(2)}`,`${best.year}年 ${Math.floor(best.stats.outs/3)}回 / 防御率${rates(best.stats).era.toFixed(2)}`],
  ['球質・制球',`最速${c.velocity}km/h / ストライク${c.pitches[0]?.strike??'—'}% / 空振り${c.pitches[0]?.whiff??'—'}%`,`通算奪三振${r.total.so} / K/BB ${rates(r.total).kbb?.toFixed(2)??'—'}`],
  ['想定起用',c.projection,`${r.rows.at(-1).role} / 先発で90回以上を投げた年 ${r.rows.filter(x=>x.role==='先発'&&x.stats.outs>=270).length}年`]
 ]:[
  ['打撃',`打率${rates(y.stats).avg.toFixed(3)} / ${y.stats.hr}本 / OPS ${rates(y.stats).ops.toFixed(3)}`,`${best.year}年 打率${rates(best.stats).avg.toFixed(3)} / ${best.stats.hr}本 / OPS ${rates(best.stats).ops.toFixed(3)}`],
  ['守備',`${c.position} / 守備範囲 ${c.defenseTools?.range==null?'未記録':toolLabel(c.defenseTools.range)}`,`守備でプラス貢献した年 ${r.rows.filter(x=>x.defense?.games>=40&&x.defense.contribution>0).length}年 / 最終${r.rows.at(-1).position}`],
  ['走塁',`50m ${c.contact.run50}秒 / 直近${y.stats.sb}盗塁`,`通算${r.total.sb}盗塁 / 年間最多${Math.max(...r.rows.map(x=>x.stats.sb))}盗塁`],
  ['想定起用',c.projection,`${r.rows.at(-1).position}・${r.rows.at(-1).role}`]
 ];
 const first=r.rows.findIndex(x=>pitch?x.stats.outs>=270||x.stats.games>=35:x.stats.ab>=300);
 return {rows,summary:first<0?'計測やアマチュア実績の魅力を、一軍のまとまった出場機会へつなげられなかった。':`${first+1}年目にまとまった一軍起用を得た。ピークは${best.year}年（${best.age}歳）。指名時の数字だけでは、この時期や継続性までは読めなかった。`};
}
