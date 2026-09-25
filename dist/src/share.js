import {sumStats,avg,ops,era,innings,decimal} from './stats.js';
import {money} from './format.js';
// Set this to the real public game URL when available. Never use a placeholder.
export const SHARE_GAME_URL='https://hakkyu-jinsei.com/';
export function careerCardData(s){
 if(!s.retired)throw Error('引退後に結果を共有できます。');
 const pro=s.records.filter(r=>['pro','mlb'].includes(r.stage));
 const rows=pro.length?pro:s.records,total=sumStats(rows),pitch=s.player.role==='pitcher';
 const years=new Set(rows.map(r=>r.year)).size;
 const counts=new Map();for(const a of s.awards||[])counts.set(a.title,(counts.get(a.title)||0)+1);
 const mvp=[...counts].filter(([title])=>/MVP/.test(title)).reduce((n,[,v])=>n+v,0);
 const titles=[...counts].filter(([title])=>!/MVP/.test(title)).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([title,count])=>title+' ×'+count);
 const draft=(s.drafts||[]).filter(d=>d.rank>0).sort((a,b)=>a.rank-b.rank)[0];
 const honors=[...new Set((s.honors||[]).filter(h=>/永久欠番|名球会|殿堂/.test(h.title)).map(h=>h.title==='永久欠番'?h.team+' 永久欠番 #'+h.number:h.title))].sort((a,b)=>Number(b.includes('永久欠番'))-Number(a.includes('永久欠番'))).slice(0,2);
 const records=(s.recordHistory||[]).slice().sort((a,b)=>Number(b.title.includes('世界'))-Number(a.title.includes('世界'))).slice(0,2).map(r=>r.title+' '+r.value);
 const metrics=pitch?[['勝利',total.wins],['防御率',total.outs?era(total).toFixed(2):'—'],['奪三振',total.so],['投球回',innings(total)],['セーブ',total.saves],['登板',total.games]]:[['安打',total.hits],['本塁打',total.hr],['打率',total.ab?decimal(avg(total)):'—'],['打点',total.rbi],['盗塁',total.sb],['OPS',total.ab?decimal(ops(total)):'—']];
 return {name:s.player.name,pitch,scope:pro.length?'国内一軍・海外メジャー通算':'アマチュア・独立リーグ通算',years,metrics,
  facts:[(pro.length?'プロ実働 ':'現役記録 ')+years+'年',draft?'最高ドラフト指名 '+(draft.type==='育成'?'育成 ':'')+draft.rank+'位':'ドラフト指名記録なし',
   '最高年俸 '+money(Math.max(0,...s.records.map(r=>r.salary||0))),
   'MVP '+mvp+'回 ／ オールスター '+(s.allStars||[]).filter(a=>a.selected).length+'回',
   'メジャー経験 '+new Set(pro.filter(r=>r.stage==='mlb'&&r.stats.games>0).map(r=>r.year)).size+'年'],
  highlights:[...honors,...records,...titles].slice(0,4)};
}
export function careerShareText(card){
 return ['白球人生｜'+card.name+'の野球人生',card.scope+'・'+card.years+'年',card.metrics.map(([label,value])=>label+' '+value).join(' ／ '),...card.highlights.slice(0,2),'#白球人生',SHARE_GAME_URL].filter(Boolean).join('\n');
}
export async function makeCareerCard(s){
 const card=careerCardData(s),canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('このブラウザでは画像を生成できません。');
 const text=(value,x,y,size,color='#f4f6f8',width=944,weight=600)=>{
  ctx.fillStyle=color;ctx.font=weight+' '+size+'px system-ui, sans-serif';
  while(ctx.measureText(String(value)).width>width&&size>18){size--;ctx.font=weight+' '+size+'px system-ui, sans-serif';}
  let line=String(value);while(ctx.measureText(line).width>width&&line.length>1)line=line.slice(0,-2)+'…';
  ctx.fillText(line,x,y);
 };
 ctx.fillStyle='#101820';ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle='#1d302c';ctx.fillRect(0,0,1080,270);
 ctx.strokeStyle='#d8c68e';ctx.lineWidth=3;ctx.strokeRect(28,28,1024,1294);
 text('白球人生',68,100,43,'#e5d39c',944,800);
 text('CAREER / FINAL RECORD',70,141,20,'#a7b9b3');
 text(card.name,68,220,58,'#ffffff',944,800);
 text((card.pitch?'PITCHER':'BATTER')+'  /  '+card.scope,68,315,24,'#b8c9c2');
 card.metrics.forEach(([label,value],i)=>{
  const x=68+(i%3)*320,y=360+Math.floor(i/3)*170;
  ctx.fillStyle='#19252f';ctx.fillRect(x,y,304,152);
  text(label,x+20,y+39,23,'#b6c7cc',260);
  text(typeof value==='number'?value.toLocaleString('ja-JP'):value,x+20,y+112,58,'#ffffff',260,800);
 });
 card.facts.forEach((line,i)=>text(line,72,756+i*45,27,'#d6dfe3'));
 ctx.fillStyle='#d8c68e';ctx.fillRect(68,976,944,2);
 card.highlights.forEach((line,i)=>text(line,72,1019+i*45,26,'#e5d39c'));
 text('#白球人生',68,1260,34,'#a6e1c2',680,800);
 text('MY BASEBALL STORY',720,1260,18,'#98aaa3',292);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('画像生成に失敗しました。')),'image/png'));
 return {blob,preview:canvas.toDataURL('image/png'),text:careerShareText(card),filename:'hakkyu-jinsei-career.png'};
}
export function canShareCareerFile(asset){
 try{return typeof File!=='undefined'&&!!globalThis.navigator?.share&&!!globalThis.navigator?.canShare?.({files:[new File([asset.blob],asset.filename,{type:'image/png'})]});}catch{return false;}
}
export async function shareCareerFile(asset){
 if(!canShareCareerFile(asset))return false;
 try{await navigator.share({title:'白球人生',text:asset.text,files:[new File([asset.blob],asset.filename,{type:'image/png'})]});return true;}
 catch(error){if(error.name==='AbortError')return true;return false;}
}
