import {between,random,pick} from './random.js';
export const POSITIONS={third:'三塁手',shortstop:'遊撃手',second:'二塁手',first:'一塁手',left:'左翼手',center:'中堅手',right:'右翼手',catcher:'捕手',dh:'指名打者'};
export const STYLES={balanced:{name:'バランス型',boost:[]},average:{name:'アベレージヒッター',boost:['meet','eye']},power:{name:'パワーヒッター',boost:['power','clutch']},speed:{name:'韋駄天',boost:['speed','eye']},defense:{name:'守備職人',boost:['field','arm','throwing','speed']}};
export const PITCH_STYLES={power:{name:'本格派',boost:['velocity','strikeout','stamina']},technical:{name:'技巧派',boost:['control','breaking']}};
export const HANDS={right:'右',left:'左',both:'両'};
export const BATTER_ROLES={regular:'レギュラー',reserve:'控え',defense:'守備固め要員',runner:'代走要員',pinch:'代打要員',pinchAce:'代打の切り札'};
export const PITCH_ROLES={starter:'先発ローテーション',reliever:'中継ぎ',setup:'セットアッパー',closer:'抑え',bench:'控え',cleanup:'敗戦処理'};
export const reliefRole=s=>s.player.pitchRole!=='starter';
export const pitchGameFactor=s=>s.player.pitchRole==='starter'?.2:s.player.pitchRole==='bench'?.07:s.player.pitchRole==='cleanup'?.22:.42;
export function migrateProfile(s){const p=s.player;p.throwHand??='right';p.batHand??='right';p.pitchStyle??='power';p.batterRole??='reserve';p.position=p.position==='infield'?'shortstop':p.position==='outfield'?'center':POSITIONS[p.position]?p.position:'shortstop';p.naturalPosition=POSITIONS[p.naturalPosition]&&p.naturalPosition!=='dh'?p.naturalPosition:p.position==='dh'?'first':p.position;if(!canUseDH(s)&&p.position==='dh')p.position=p.naturalPosition;p.style=STYLES[p.style]?p.style:'balanced';p.pitchRole=PITCH_ROLES[p.pitchRole]?p.pitchRole:'starter';p.roleWish=PITCH_ROLES[p.roleWish]?p.roleWish:'auto';s.schoolOffers??=[];s.scoutPopup??=false;s.jerseyHistory??=[];if(!Number.isInteger(p.number)||p.number<0||p.number>99)p.number=p.role==='pitcher'?18:6;s.allStars??=[];s.honors??=[];s.nationalOffers??=[];s.overseasExposure??=0;s.careerPromises??=[];}
export function assignNumber(s){const previous=s.player.number;let hash=0;for(const ch of s.team)hash=(hash*31+ch.charCodeAt(0))>>>0;let number=(hash+s.seed)%99+1;s.player.number=number;s.jerseyHistory.push({year:s.year,team:s.team,number});if(previous!==number)s.news.push('背番号'+number+'で新しいチームへ。');return number;}
export function configurePlayer(s,position,style){if(position==='dh')throw Error('指名打者はプロ・社会人でチーム事情に応じて決まります。');migrateProfile(s);const aliases={infield:'shortstop',outfield:'center'};s.player.position=POSITIONS[position]?position:aliases[position]||'shortstop';s.player.naturalPosition=s.player.position;s.player.style=STYLES[style]?style:'balanced';}
export const canPitchRole=s=>s.player.role==='pitcher'&&!['elementary','middle','high'].includes(s.stage);
export function requestPitchRole(s,id){if(!canPitchRole(s)||s.retired||!['auto',...Object.keys(PITCH_ROLES)].includes(id))throw Error('高校卒業後の投手だけが起用希望を出せます。');s.player.roleWish=id;s.timeline.push({year:s.year,text:'次のシーズンの起用希望：'+(PITCH_ROLES[id]||'チームに任せる')});}
export function assignPitchRole(s){if(!canPitchRole(s))return;const a=s.player.abilities,mean=(a.velocity+a.control+a.stamina+a.breaking+a.strikeout)/5;const scores={starter:a.stamina*.65+a.control*.35,reliever:(a.control+a.breaking)/2,setup:a.control*.55+a.strikeout*.45,closer:a.strikeout*.6+a.velocity*.4};const needs={};for(const k of Object.keys(scores))needs[k]=between(s,-14,14);s.pitchNeeds=needs;const wish=s.player.roleWish;const eligible=k=>k!=='starter'||a.stamina>=45;const candidates=Object.keys(scores).filter(eligible);let role=mean<40?'bench':mean<50?'cleanup':candidates.sort((x,y)=>(scores[y]+needs[y])-(scores[x]+needs[x]))[0];if(PITCH_ROLES[wish]&&eligible(wish)&&(wish==='bench'||wish==='cleanup'||mean>=50&&scores[wish]>=45)&&random(s)<.65)role=wish;if(s.activeContract?.endYear>=s.year&&s.activeContract.guarantees?.regular)role=s.activeContract.guarantees.pitchRole||(['bench','cleanup'].includes(role)?'reliever':role);s.player.pitchRole=role;s.news.push('今季の起用：'+PITCH_ROLES[role]+'。能力とチームの投手構成から決定'+(PITCH_ROLES[wish]?'（希望：'+PITCH_ROLES[wish]+'）':'')+'。');}
export const playerLabel=s=>s.player.role==='pitcher'?'投手・'+(PITCH_STYLES[s.player.pitchStyle]?.name||'本格派')+(canPitchRole(s)?'・'+PITCH_ROLES[s.player.pitchRole||'starter']:''):(BATTER_ROLES[s.player.batterRole]||'控え')+'・'+(POSITIONS[s.player.position]||'遊撃手')+'・'+(STYLES[s.player.style]?.name||'バランス型');

export function canUseDH(s){return ['pro','mlb','independent','corporate'].includes(s.stage);}
export function assignBatterPosition(s){if(s.player.role!=='batter')return;const p=s.player;p.position=p.naturalPosition||'first';if(!canUseDH(s))return;const need=random(s);const chance=Math.min(.48,.07+Math.max(0,p.abilities.power-p.abilities.field)*.006+(s.age>=33?.12:0));if(need<chance){p.position='dh';s.news.push('チーム事情により、今季は指名打者として起用。打撃に専念する。');}s.dhAssignment={year:s.year,assigned:p.position==='dh'};}

export function configureStart(s,options={}){const p=s.player,all=options.role==='random';if(all)p.role=pick(s,['batter','pitcher']);const resolve=(v,keys)=>all||v==='random'?pick(s,keys):keys.includes(v)?v:keys[0];p.throwHand=resolve(options.throwHand,Object.keys(HANDS));p.batHand=resolve(options.batHand,Object.keys(HANDS));const position=all?pick(s,Object.keys(POSITIONS).filter(k=>k!=='dh')):options.positionGroup==='outfield'?pick(s,['left','center','right']):options.positionGroup==='catcher'?'catcher':options.positionGroup==='infield'?resolve(options.position,['first','second','third','shortstop']):resolve(options.position,Object.keys(POSITIONS).filter(k=>k!=='dh'));configurePlayer(s,position,resolve(options.style,Object.keys(STYLES)));p.pitchStyle=resolve(options.pitchStyle,Object.keys(PITCH_STYLES));}
export function assignBatterRole(s,competition=64){
 if(s.player.role!=='batter')return;
 const p=s.player,a=p.abilities,bat=(a.meet+a.power+a.eye)/3,previous=p.batterRole;
 const defense=a.field*.65+a.arm*.2+(a.throwing??a.field)*.15,runner=a.speed;
 let r=bat>=competition?'regular':'reserve';
 if(r==='reserve'){
  const canDefend=defense>=competition+5,canRun=runner>=competition+5;
  if(canDefend||canRun)r=canRun&&(!canDefend||runner+(p.style==='speed'?4:0)>defense+(p.style==='defense'?4:0))?'runner':'defense';
 }
 const adult=!['elementary','middle','high'].includes(s.stage);
 const limitedField=p.position!=='dh'&&defense<competition-18;
 const veteran=s.age>=35&&(defense+runner)/2<competition-9&&bat<competition+15;
 if(adult&&bat>=competition-6&&((r==='regular'&&(limitedField||veteran))||r==='reserve'))r=bat>=competition+6&&a.clutch>=competition+5?'pinchAce':'pinch';
 if(s.activeContract?.endYear>=s.year&&s.activeContract.guarantees?.regular)r='regular';
 if(s.contractStatus==='development'&&s.stage==='pro')r='reserve';
 if(['runner','defense'].includes(r)&&p.position==='dh')p.position=p.naturalPosition||'first';
 p.batterRole=r;
 if(previous!==r){const text='起用変更：'+(BATTER_ROLES[previous]||'控え')+' → '+BATTER_ROLES[r]+'。現在の打撃・守備・走力・年齢から評価。';s.news.push(text);s.timeline.push({year:s.year,text});}
}
export const handLabel=s=>(HANDS[s.player.throwHand]||'右')+'投げ・'+(HANDS[s.player.batHand]||'右')+'打ち';
