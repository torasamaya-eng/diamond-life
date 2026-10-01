import {TEAMS,LEAGUES} from './config.js';
import {random} from './random.js';
export const POSITIONS=['先発','救援','捕手','一塁','二塁','三塁','遊撃','左翼','中堅','右翼'];
export const PHILOSOPHIES=['即戦力重視','高校生素材重視','投手優先','センターライン重視','身体能力重視','実績重視','medical慎重','将来性重視'];
const kinds={
 starter:['即戦力の先発投手','先発','即戦力'],leftStarter:['左の先発候補','先発','左腕'],powerPitcher:['球威型投手','先発','球威'],control:['制球型投手','先発','制球'],leftRelief:['左の中継ぎ','救援','左腕'],closer:['将来の守護神候補','救援','将来'],firstPower:['強打の一塁手','一塁','長打'],middleBat:['中軸候補','三塁','長打'],speedCenter:['俊足センター','中堅','走力'],shortDefense:['守備型遊撃手','遊撃','守備'],catcherArm:['強肩捕手','捕手','肩'],catcherReady:['即戦力捕手','捕手','即戦力'],catcherFuture:['高校生捕手','捕手','将来'],highTools:['高校生素材型','外野','将来'],college:['大学生即戦力','全体','即戦力'],corporate:['社会人即戦力','全体','即戦力'],specialist:['守備走塁の一芸型','外野','守備走塁']
};
export const NEEDS=Object.fromEntries(Object.entries(kinds).map(([id,[label,position,type]])=>[id,{id,label,position,type}]));
export function teamProfile(seed,index){
 const rng=random(`${seed}:team-context:${index}`),context=Object.fromEntries(POSITIONS.map(p=>[p,{strength:rng.int(30,85),age:rng.int(24,35),depth:rng.int(1,5)}]));
 const weak=POSITIONS.toSorted((a,b)=>(context[a].strength-context[a].age-5/context[a].depth)-(context[b].strength-context[b].age-5/context[b].depth));
 const options=p=>Object.values(NEEDS).filter(n=>n.position===p);
 const chosen=[];for(const p of weak){const choices=options(p).filter(n=>!chosen.some(x=>x.id===n.id));if(choices.length)chosen.push(rng.pick(choices));if(chosen.length===2)break;}
 chosen.push(rng.pick(Object.values(NEEDS).filter(n=>!chosen.some(x=>x.id===n.id)&&['将来','即戦力','守備走塁'].includes(n.type))));
 const needs=chosen.map((n,i)=>({...n,priority:['最優先','優先','将来・追加枠'][i],reason:context[n.position]?`${n.position}は${context[n.position].age>=31?'高齢化が進み世代交代が必要':context[n.position].depth<=2?'控えが少なく選手層が薄い':'主力候補の競争を促したい'}。${n.type==='将来'?'数年後を見据えて育成する候補が欲しい。':n.type==='即戦力'?'早期に一軍で使える完成度を重視。':`${n.type}を武器に出場機会を作れる選手を求める。`}`:'今ある戦力とは異なる武器を加え、数年後の編成に選択肢を残したい。'}));
 return {team:TEAMS[index],league:LEAGUES[index<6?0:1],context,needs,philosophy:PHILOSOPHIES[index%PHILOSOPHIES.length]};
}
// Public scouting evidence ONLY. Numeric matching is an internal CPU aid, not a success forecast.
export function matchesNeed(c,n){if(!n)return false;const d=c.defenseTools||{},bat=c.role==='野手',pitch=c.role==='投手',left=(c.hand||'').startsWith('左投');switch(n.id){
 case 'starter':return pitch&&c.age>=21&&c.projection.includes('先発');case 'leftStarter':return pitch&&left;case 'powerPitcher':return pitch&&c.velocity>=148;case 'control':return pitch&&c.pitches[0]?.strike>=64;
 case 'leftRelief':return pitch&&left;case 'closer':return pitch&&c.pitches[0]?.whiff>=24;
 case 'firstPower':return bat&&c.position==='一塁'&&c.exitVelocity>=151;case 'middleBat':return bat&&c.exitVelocity>=157;case 'speedCenter':return c.position==='中堅'&&c.contact.run50<=6.35;
 case 'shortDefense':return c.position==='遊撃'&&(d.range??0)>=65&&(d.catching??0)>=60;case 'catcherArm':return c.position==='捕手'&&(d.arm??0)>=68;
 case 'catcherReady':return c.position==='捕手'&&c.age>=21;case 'catcherFuture':return c.position==='捕手'&&c.category==='高校';case 'highTools':return c.category==='高校'&&(c.height>=185||c.velocity>=147||c.exitVelocity>=157||c.contact.run50<=6.3);
 case 'college':return c.category==='大学';case 'corporate':return c.category==='社会人';case 'specialist':return bat&&((d.range??0)>=72||c.contact.run50<=6.25);default:return false;}}
export const fitNeeds=(c,needs)=> (needs||[]).filter(n=>matchesNeed(c,n));
export function philosophyScore(c,philosophy){switch(philosophy){case '即戦力重視':return c.age>=22?4:-2;case '高校生素材重視':return c.category==='高校'?5:0;case '投手優先':return c.role==='投手'?4:0;case 'センターライン重視':return ['捕手','二塁','遊撃','中堅'].includes(c.position)?5:0;case '身体能力重視':return c.role==='投手'?(c.velocity-145)*.5:(c.exitVelocity-150)*.15+(6.7-c.contact.run50)*4;case '実績重視':return c.representative?5:0;case 'medical慎重':return -c.medical.filter(m=>m.days>=100).length*4;case '将来性重視':return Math.max(0,22-c.age)+Math.max(0,c.trend);default:return 0;}}
export function recruitmentReview(s,results=null){
 if(s.legacyNeeds)return {items:[],summary:'旧αのドラフトでは補強要求を提示していなかったため、当時の補強目的は判定しません。'};
 const needs=s.needsAtDraft||s.teamNeeds||[],picks=s.picks.filter(p=>p.team===s.playerTeam),mine=picks.map(p=>s.candidates.find(c=>c.id===p.id));
 const items=needs.map(n=>{const fits=mine.filter(c=>matchesNeed(c,n)),careers=results?.filter(r=>fits.some(c=>c.id===r.id));
  if(!results)return {...n,status:fits.length?'候補確保':'未達',text:fits.length?`${fits.map(c=>c.name).join('・')}を獲得。定着は今後の課題。`:'条件に合う候補を指名しなかった。',candidateIds:fits.map(c=>c.id)};
  // Contribution must happen for the original club, in the requested role and timeframe.
  const progress=(careers||[]).map(r=>({name:r.name,...needProgress(r,n,TEAMS[s.playerTeam])}));
  const contributed=progress.filter(p=>p.onTime&&p.years>0),best=progress.toSorted((a,b)=>b.years-a.years)[0];
  return {...n,status:contributed.length?'狙いに応えた':fits.length?'定着・時期に課題':'当初課題は未達',milestone:best?.milestone||'未獲得',text:progress.length?progress.map(p=>`${p.name}：${p.text}`).join(' '):'補強対象とは異なる選手を選択した。',candidateIds:fits.map(c=>c.id)};
 });
 const outside=results?.filter(r=>!mine.filter(c=>fitNeeds(c,needs).length).some(c=>c.id===r.id)&&r.evaluation?.rank>=4);
 return {items,summary:outside?.length?`${outside.map(r=>r.name).join('・')}は当初の補強要求とは異なる指名だったが、長期的には大きな実績を残した。`:results?'候補確保と実際の一軍定着を分けて振り返ります。':'補強要求は判断材料です。合致しない指名も自由に選べます。'};
}
export function needProgress(r,n,team){
 const matches=r.rows.map((y,i)=>({...y,index:i})).filter(y=>fulfilledRole(y,n));
 const home=matches.filter(y=>y.team===team),away=matches.filter(y=>y.team!==team),years=home.length;
 const milestone=years>=7?'長期貢献':years>=3?'主力定着':years?'一軍起用':'候補確保';
 const onTime=n.type!=='即戦力'||home.some(y=>y.index<3);
 let text=years?`${milestone}。担当球団で求めた役割を${years}年担った（初年度は入団${home[0].index+1}年目）。`:'候補を確保したが、担当球団では求めた役割に届かなかった。';
 if(years&&!onTime)text+='活躍は遅れて訪れ、最初の3年の即戦力補強には間に合わなかった。';
 if(!years&&away.length)text+=`移籍先では${away.length}年、その役割で活躍した。`;
 return {milestone,years,onTime,awayYears:away.length,text};
}
export function fulfilledRole(y,n){if(y.stats.games===0)return false;switch(n.id){case 'starter':case 'leftStarter':return y.role==='先発'&&y.stats.outs>=270;case 'closer':return y.stats.saves>=15;case 'leftRelief':return y.role!=='先発'&&y.stats.games>=30;case 'shortDefense':return y.position==='遊撃'&&y.stats.games>=60&&(y.defense?.contribution??0)>0;case 'catcherArm':case 'catcherReady':case 'catcherFuture':return y.position==='捕手'&&y.stats.games>=50;case 'speedCenter':return y.position==='中堅'&&y.stats.games>=70;case 'firstPower':return y.position==='一塁'&&y.stats.hr>=10;case 'middleBat':return y.stats.hr>=15;case 'specialist':return ['守備固め','代走','ユーティリティ'].includes(y.role)&&y.stats.games>=40;default:return y.stats.games>=(y.role==='先発'?18:['中継ぎ','セットアッパー','抑え'].includes(y.role)?35:70);}}
