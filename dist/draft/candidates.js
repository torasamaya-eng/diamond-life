import {initializeTraits,defenseAt,fielding,scoutingTools} from './tools.js';
import {assignCandidateNames} from './names.js';
import {CONFIG,CATEGORIES,TIERS,validateConfig,PITCH_MEASUREMENT} from './config.js';
import {random,clamp,round} from './random.js';
import {batting,pitching,sum,rates} from './stats.js';
import {teamProfile} from './teams.js';
import {recruitmentAssessment} from './recruitment.js';
import {prepareDevelopment} from './development.js';
// Retained for the existing historical fielding seed; public names are assigned last.
const surnames=['青柳','寺島','川瀬','宮原','西崎','坂井','辻村','井坂','岩城','三田','藤森','小暮','相沢','橘','荒川','田代','小野寺','有村','石崎','南條'];
const names=['悠真','拓海','航平','蓮','大樹','直人','蒼太','翔吾','光希','律','湊','颯介','一真','晴斗','圭佑','恭平'];
const schools=['青陵','海風','東峰','翠嶺','白砂','北星','星見','城南'];
const curves=['steady','early','late','college','corporate','independent','rebound'];
export const abilityKeys=role=>role==='投手'?['stuff','control','breaking','stamina']:['contact','power','eye','speed','field','arm'];
export function average(a){return Object.values(a).reduce((s,v)=>s+v,0)/Object.keys(a).length;}
function timing(curve,age){if(curve==='early')return 1.15-Math.max(0,age-18)*.06;if(curve==='late')return .77+(age-16)*.035;if(curve==='college')return age<19?.86:1+(age-19)*.05;if(curve==='corporate')return age<23?.88:1.08;if(curve==='independent')return age<22?.90:1.07;return 1;}
function historyFor(c,rng,measurementModel){
 const rows=[];const h=c.hidden;for(let age=16;age<=c.age;age++){
  const stage=age<=18?'高校':c.category==='大学'||(h.college&&age<=22)?'大学':c.category;
  const growth=(age-16)*h.development,phase=timing(h.curve,age),a=Object.fromEntries(Object.entries(h.base).map(([k,v])=>[k,clamp((v+growth)*phase,20,94)]));
  const slump=h.curve==='rebound'&&age>=19&&age<=21||rng.next()<.10;const injury=rng.next()<.04+h.injury*.09?{part:rng.pick(c.role==='投手'?['右肘','肩','腰']:['膝','足首','脇腹']),days:rng.pick([14,25,60,100,200]),surgery:false}:null;
  if(injury)injury.surgery=injury.days>=200;
  const games=Math.max(0,Math.round((c.role==='投手'?rng.int(10,18):rng.int(28,45))*(injury?Math.max(.1,1-injury.days/220):1)));
  const opposition=stage==='高校'?rng.int(0,12):rng.int(8,19);const form=slump?-rng.int(7,16):rng.normal()*3;
  const stat=makeSplitStats(c,a,games,rng,opposition,form);
  const defense=c.role==='野手'?fielding(defenseAt(c,a,age),c.position,games,random(`${c.id}:field:${age}:${c.name}`)):null;
  const height=Math.round(c.height-Math.max(0,c.age-age)*(age<=18?1.3:.25));const weight=Math.max(56,Math.round(c.weight-(c.age-age)*h.bodyGain));
  const velocity=round((measurementModel==='peak-v2'?PITCH_MEASUREMENT.base+(a.stuff??50)*PITCH_MEASUREMENT.stuffScale:119+(a.stuff??50)*.40)+rng.normal()*.6,1),exitVelocity=round(112+(a.power??50)*.69+rng.normal(),1);
  const national=rng.next()<.28?{games:c.role==='投手'?2:5,stats:makeStats(c,a,c.role==='投手'?2:5,rng,opposition+12,form+h.pressure*7-3.5)}:null;
  const situations=c.role==='投手'?{empty:makeStats(c,a,4,rng,opposition,form),runners:makeStats(c,a,4,rng,opposition,form-h.setLoss*.7+h.pressure*3)}:{fastball:makeStats(c,a,8,rng,opposition,form+(a.contact-a.eye)*.15),breaking:makeStats(c,a,8,rng,opposition,form+(a.eye-a.contact)*.25),risp:makeStats(c,a,6,rng,opposition,form+(h.pressure-.5)*6)};
  const league=opposition<6?'地域リーグ':opposition<13?'地区強豪リーグ':'全国水準リーグ';
  rows.push({age,year:CONFIG.startYear-(c.age-age),stage,label:`${stage}${age<=18?age-15:stage==='大学'?age-18:age-(h.college?22:18)}年`,height,weight,velocity,exitVelocity,opposition,league,slump,injury,...stat,national,situations,defense});
 }
 const last=rows.at(-1);h.current=Object.fromEntries(Object.entries(h.base).map(([k,v])=>[k,clamp((v+(c.age-16)*h.development)*timing(h.curve,c.age),20,94)]));return rows;
}
function makeStats(c,a,g,rng,d,f=0){return c.role==='投手'?pitching(a,g,rng,{difficulty:d-10,form:f}):batting(a,g,rng,{difficulty:d-(c.category==='高校'?38:32),form:f});}
function makeSplitStats(c,a,g,rng,d,f){
 const groups=[Math.floor(g*.68),g-Math.floor(g*.68)];const right=makeStats(c,a,groups[0],rng,d,f),left=makeStats(c,a,groups[1],rng,d,f+c.hidden.leftSplit);
 return {stats:sum([right,left]),splits:{right,left}};
}
export function generateCandidates(seed,config=CONFIG){
 validateConfig(config);const rng=random(`${seed}:pool`);const candidates=[];
 for(let i=0;i<config.candidatePoolSize;i++){
  const category=i<4?CATEGORIES[i]:rng.pick(CATEGORIES),role=rng.next()<.47?'投手':'野手',college=category==='大学'||rng.next()<.55,age=category==='高校'?18:category==='大学'?22:college?rng.int(24,26):rng.int(20,23);
  const quality=clamp(49+rng.normal()*12,27,78),base=Object.fromEntries(abilityKeys(role).map(k=>[k,clamp(quality+rng.normal()*10,20,87)]));
  const c={id:`p${i}`,name:`${rng.pick(surnames)} ${rng.pick(names)}`,category,age,role,position:role==='投手'?'先発':rng.pick(['捕手','一塁','二塁','三塁','遊撃','左翼','中堅','右翼']),hand:rng.pick(['右投右打','右投左打','左投左打']),school:rng.pick(schools)+(category==='高校'?'高校':category==='大学'?'大学':category==='社会人'?'製作所':'クラブ'),height:rng.int(171,195),weight:rng.int(70,98),family:rng.next()<.12?rng.pick(['父は元プロ外野手','兄は国内プロ投手','父は大学野球の指導者']):null,condition:'制限なし',hidden:{base,college,curve:rng.pick(curves),development:rng.int(1,4)*.45,potential:clamp(quality+12+rng.normal()*13,45,97),peakAge:rng.int(27,33),injury:rng.next(),repair:rng.next(),adaptability:rng.next(),pressure:rng.next(),consistency:rng.next(),ambition:rng.next(),selfCare:rng.next(),leftSplit:rng.int(-12,6),setLoss:rng.int(0,8),bodyGain:rng.int(1,3)}};
  // At most four restricted candidates: every club can finish every round.
  if(i<4)c.condition=i%2?'2位まで・未指名なら進学／残留':'支配下のみ';
  if(c.role==='野手'&&['捕手','二塁','三塁','遊撃'].includes(c.position)&&c.hand==='左投左打')c.hand='右投左打';
  if(c.hidden.curve==='early')c.hidden.peakAge-=2;if(c.hidden.curve==='late')c.hidden.peakAge+=2;
  initializeTraits(c,seed,{specialize:true});
  if(['adaptation-v1','adaptation-v2'].includes(config.careerModel))prepareDevelopment(c,quality,config.careerModel);
  c.history=historyFor(c,rng,config.measurementModel);const latest=c.history.at(-1),prev=c.history.at(-2),a=c.hidden.current;
  c.velocity=latest.velocity;c.exitVelocity=latest.exitVelocity;c.trend=round(role==='投手'?latest.velocity-prev.velocity:(latest.exitVelocity-prev.exitVelocity),1);
  c.representative=latest.national&&(role==='投手'?rates(latest.national.stats).era<2.8:rates(latest.national.stats).ops>.83)?category==='高校'?'U18候補合宿':category==='大学'?'大学代表選出':'全国大会優秀選手':null;
  c.medical=c.history.filter(y=>y.injury).map(y=>({year:y.year,...y.injury}));
  c.medicalFinding=c.medical.some(x=>x.surgery)?'術後の投球・走行を再開。連戦時の回復は継続確認。':c.medical.length?'復帰後に出場を継続。負荷を上げた際の再発を観察中。':'現時点で長期離脱の申告なし。将来の健康を保証する所見ではない。';
  c.pitches=role==='投手'?['直球','スライダー','カーブ',rng.pick(['フォーク','チェンジアップ'])].map((name,j)=>({name,velocity:round(c.velocity-[0,16,32,23][j],1),whiff:round(clamp((j?a.breaking:a.stuff)*.30+rng.normal()*2,8,36),1),strike:round(clamp(43+a.control*.3-j*2,45,76),1),spin:Math.round((j===0?1700:1900)+(j?a.breaking:a.stuff)*6),note:j===3&&a.breaking<58?'第三球種は習得途上':'試合で使用を継続'})):[];
  c.contact={exitVelocity:c.exitVelocity,hardHit:round(clamp(10+(a.power??50)*.5,15,62),1),swing:round(91+(a.power??50)*.48,1),opposite:round(clamp(12+(a.contact??50)*.2,14,34),1),run50:round(7.4-(a.speed??50)*.016,2),throw:Math.round(85+(a.arm??50)*.6)};
  c.defenseTools=scoutingTools(c,seed);
  c.setVelocity=round(c.velocity-c.hidden.setLoss,1);
  c.projection=role==='投手'?(a.stamina<55||c.hidden.setLoss>4?'中継ぎからの起用も検討':'先発を軸に評価'):c.position==='遊撃'&&a.field<60?'三塁への転向も検討':c.position==='捕手'&&a.field<58?'一塁・打撃専念も検討':`${c.position}での定着を評価中`;
  c.observation=c.hidden.repair>.6?'指摘された動作を翌週の試合で試していた。':c.hidden.pressure>.6?'失点・失策後も次のプレーへ切り替えていた。':'試合中の修正には時間をかける。練習では同じ動作を反復。';
  candidates.push(c);
 }
 // Public rankings use observable evidence, never ceiling, growth curve or future RNG.
 const ordered=[...candidates].sort((a,b)=>publicScore(b)-publicScore(a));
 ordered.forEach((c,i)=>{c.rank=i+1;c.tier=TIERS[i<12?0:i<28?1:i<46?2:i<63?3:4];c.surveys=Math.round(clamp(12-i/7+rng.normal(),1,12));c.interviews=Math.round(clamp(c.surveys-rng.int(1,6),0,12));c.movement=c.trend>3?'急上昇':c.trend>1?'上昇':c.trend<-3?'急落':c.trend<-1?'下降':'横ばい';});
 if(config.scoutingModel==='club-v1'){
  const profiles=Array.from({length:config.teamCount},(_,i)=>teamProfile(seed,i,config.needsModel==='available-v1'?candidates.map(report):null));
  for(const c of candidates){
   c.surveyDetails=profiles.map(profile=>({team:profile.team,...recruitmentAssessment(report(c),profile,seed)})).filter(a=>a.survey).map(a=>({team:a.team,reasons:a.reasons,interview:a.interview}));
   c.surveys=c.surveyDetails.length;c.interviews=c.surveyDetails.filter(a=>a.interview).length;
  }
 }
 assignCandidateNames(candidates,seed);
 return candidates;
}
export function publicScore(c){
 const y=c.history.at(-1),r=rates(y.stats),d=c.defenseTools||{},age=Math.max(0,c.age-19),medical=c.medical.filter(m=>m.days>=100).length*2;
 const reputation=(c.representative?3:0)+(c.family?2:0)+Math.max(-3,Math.min(4,c.trend))+(y.opposition-10)*.22-medical;
 if(c.role==='投手')return 38+(c.velocity-140)*1.5+(4-Math.min(8,r.era))*2+Math.min(7,r.kbb??7)+c.pitches[0].whiff*.35+c.pitches[0].strike*.12-age*.55+reputation;
 const tools=(d.range||50)*.09+(d.arm||50)*.08+(d.speed||50)*.09;
 const limitation=c.position==='一塁'?7:c.position==='左翼'?3:0;
 return 22+r.ops*22+(c.exitVelocity-145)*.75+tools+Math.max(0,c.height-180)*.22-age*.8-limitation+reputation;
}
// Explicit allowlist prevents CPU and UI accidentally discovering the career answer.
export function report(c){const {id,name,category,age,role,position,hand,school,height,weight,family,condition,history,velocity,exitVelocity,trend,representative,medical,medicalFinding,pitches,contact,setVelocity,projection,observation,rank,tier,surveys,interviews,surveyDetails,movement,defenseTools,personality}=c;return {id,name,category,age,role,position,hand,school,height,weight,family,condition,history,velocity,exitVelocity,trend,representative,medical,medicalFinding,pitches,contact,setVelocity,projection,observation,rank,tier,surveys,interviews,surveyDetails,movement,defenseTools,personality};}
export function scouts(c){const y=c.history.at(-1),r=rates(y.stats);return c.role==='投手'?[`球質担当：${c.velocity}km/h、直球の空振り率${c.pitches[0].whiff}%。${c.velocity>147?'球威担当としては先発で育てたい':'球速だけでなく打者の反応を見たい'}。`,`実戦担当：防御率${r.era.toFixed(2)}。セット時${c.setVelocity}km/h${c.velocity-c.setVelocity>4?'への低下は課題':'を維持'}。${c.projection}。`,`育成担当：前年から${c.trend>=0?'+':''}${c.trend}km/h。${c.observation}`]:[`打撃担当：最高打球速度${c.exitVelocity}km/h。${y.stats.hr}本塁打。${c.exitVelocity>160?'守備位置にこだわらず打席を与えたい':'打球の強さと対戦相手を併せて評価'}。`,`守備担当：現在${c.position}。${c.projection}。守備範囲は${c.defenseTools?.range>=70?'高く評価':'実戦で確認したい'}。肩も含めて${c.position}で残せるかを見たい。50m走${c.contact.run50}秒。`,`育成担当：体重${c.history[0].weight}→${c.weight}kg。${c.observation} ${c.age<=19&&((c.defenseTools?.arm??0)>70||c.height>=187)?'身体能力は魅力。技術の粗さを埋める時間も必要。':'完成度と年齢を合わせて考えたい。'} ${c.personality?.[1]?.tone==='concern'?'関係者の人物評には懸念もあり、面談との違いを確認したい。':'人物面の良い評判だけで上位指名とは決められない。'}`];}
