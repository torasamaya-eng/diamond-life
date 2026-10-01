import {random,clamp,round} from './random.js';
export function initializeTraits(c,seed,{specialize=false}={}){
 const rng=random(`${seed}:tools-person:${c.id}`),h=c.hidden,b=h.base;
 if(specialize&&c.role==='野手'){const bat=rng.normal()*13,glove=rng.normal()*15,legs=rng.normal()*15;b.contact=clamp(b.contact+bat,20,92);b.power=clamp(b.power+bat+rng.normal()*9,20,95);b.field=clamp(b.field+glove-bat*.3,20,95);b.speed=clamp(b.speed+legs-bat*.3,20,97);b.arm=clamp(b.arm+rng.normal()*17,20,97);}
 h.personality??={workEthic:clamp(.5+rng.normal()*.23,0,1),leadership:rng.next(),confidence:rng.next(),coachability:h.repair,adaptability:h.adaptability,selfManagement:h.selfCare,pressureResistance:h.pressure,consistency:h.consistency,ambition:h.ambition};
 h.defense??={range:clamp((b.field??50)*.6+(b.speed??50)*.4+rng.normal()*8,15,97),catching:clamp((b.field??50)+rng.normal()*10,15,97),throwing:clamp((b.field??50)*.6+(b.arm??50)*.4+rng.normal()*12,15,97),blocking:clamp((b.field??50)+rng.normal()*12,15,97),running:clamp((b.speed??50)*.4+(b.eye??50)*.6+rng.normal()*10,15,97)};
 // Sourced impressions can be imperfect. They are not identical to personality values.
 const p=h.personality,observe=x=>clamp(x+rng.normal()*.18,0,1);
 c.personality??=[{source:'面談',text:observe(p.coachability)>.6?'課題と練習方法の説明が具体的。指導を取り入れたいとの話。':'自分の調整方法へのこだわりが強いという印象。',tone:observe(p.coachability)>.5?'positive':'mixed'},
 {source:'学校・所属先関係者',text:observe(p.workEthic)>.58?'自主練習にも熱心という評価。':observe(p.selfManagement)<.38?'生活リズムや練習開始時刻に注意を受けたことがあるとの話。':'練習態度に波があるという声もあり、継続して確認したい。',tone:observe(p.workEthic)>.55?'positive':'concern'},
 {source:'チームメイト評',text:observe(p.leadership)>.65?'後輩への声掛けが多く、周囲の信頼が厚いという。':'自分の課題に集中するタイプとの評。',tone:'mixed'},
 {source:'別のスカウト',text:observe(p.pressureResistance)>.55?'失敗した場面でも次のプレーへ切り替えているように見える。':'失敗が続いた後の切り替えは、もう少し観察したい。',tone:'mixed'}];
}
export function defenseAt(c,a,age=c.age){const h=c.hidden,base=h.defense,delta=(a.field??50)-(h.base.field??50),ageLoss=Math.max(0,age-29);return {field:a.field??50,range:clamp(base.range+delta*.6-ageLoss*.65,10,98),catching:clamp(base.catching+delta*.7,10,98),throwing:clamp(base.throwing+delta*.6-ageLoss*.2,10,98),blocking:clamp(base.blocking+delta*.6,10,98),arm:a.arm??50,speed:a.speed??50,running:clamp(base.running+((a.eye??50)-(h.base.eye??50))*.4,10,98)};}
export function scoutingTools(c,seed){const rng=random(`${seed}:measure:${c.id}`),t=defenseAt(c,c.hidden.current);return Object.fromEntries(Object.entries(t).map(([k,v])=>[k,Math.round(clamp(v+rng.normal()*5,10,98))]));}
export const toolLabel=x=>x>=80?'候補トップ級':x>=68?'高い':x>=53?'平均域':x>=40?'課題あり':'大きな課題';
export function fielding(tools,position,games,rng){
 if(position==='指名打者')games=0;
 const count=(n,p)=>{let v=0;for(let i=0;i<n;i++)if(rng.next()<p)v++;return v;};
 const outfield=['左翼','中堅','右翼'].includes(position),catcher=position==='捕手';
 const chances=position==='指名打者'?0:Math.round(games*(catcher?7:position==='一塁'?7.5:outfield?2.1:4.1)*(1+(tools.range-50)*.002));
 const errors=count(chances,clamp(.06-(tools.catching+tools.throwing)*.00027,.004,.05)),assists=catcher?Math.round(chances*.08):outfield?count(games,.035+(tools.arm-40)*.001):Math.round((chances-errors)*.58);
 const attempts=catcher?Math.round(games*.65):0,caught=count(attempts,clamp(.09+(tools.arm+tools.throwing)*.0018,.12,.48));
 return {games:position==='指名打者'?0:games,chances,errors,putouts:chances-errors-assists,assists,doublePlays:outfield||catcher?0:count(games,.19),attempts,caught,passedBalls:catcher?count(games,clamp(.18-tools.blocking*.0017,.012,.15)):0,contribution:round(games/100*((tools.range+tools.catching+tools.throwing-150)/28+(tools.arm-50)/45)*(outfield?.8:catcher?1.2:1),2),tools:{...tools}};
}
export function defenseRate(d){return d?.chances?(d.chances-d.errors)/d.chances:null;}
