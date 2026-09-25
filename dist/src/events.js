import {pick,random} from './random.js';
import {STYLES,PITCH_STYLES} from './profile.js';
import {BREAKOUT} from './balance.js';
import {developmentRoll,developmentTime,recordDevelopmentEvent,developmentHealthFactor} from './development.js';
export function breakoutAvailable(s){
 const history=(s.developmentHistory||[]).filter(h=>h.type==='BREAKOUT'||h.kind==='breakout');
 return history.length<BREAKOUT.maxEvents&&(!history.length||s.year-history.at(-1).year>=BREAKOUT.cooldown);
}
export function breakoutChance(s){
 const p=s.player,t=p.developmentTraits,st=s.currentLevels?.second?.games>s.current.games?s.currentLevels.second:s.current;
 if(s.age<BREAKOUT.minAge||s.age>p.peakAge||!breakoutAvailable(s)||(s.lastGrowth?.healthFactor??developmentHealthFactor(s))<BREAKOUT.minimumHealth||!st?.games||st.games<BREAKOUT.minimumGames)return 0;
 const good=p.role==='pitcher'?st.outs>0&&st.er*27/st.outs<=BREAKOUT.goodERA:st.ab>0&&st.hits/st.ab>=BREAKOUT.goodAverage;
 const national=s.nationalHistory.some(n=>n.year===s.year&&n.selected);
 const adapted=s.developmentState?.adaptation&&!s.developmentState.adaptation.failed;
 if(!good&&!national&&!adapted)return 0;
 const hidden=t.hiddenBreakout;
 let chance=BREAKOUT.baseChance+hidden*BREAKOUT.traitChance;
 if(s.stage==='independent'&&good)chance+=hidden*BREAKOUT.independentBonus;
 if(s.developmentState?.stagnation)chance*=BREAKOUT.stagnationFactor;
 return chance;
}
export function seasonEvent(s){
 if(random(s)>.4)return;
 const events=[{text:'コーチとの居残り練習。技術に手応えを感じた。',key:s.player.role==='pitcher'?'control':'meet'},{text:'接戦を経験し、プレッシャーに強くなった。',key:s.player.role==='pitcher'?'strikeout':'clutch'},{text:'仲間と続けた基礎練習が実を結んだ。',key:s.player.role==='pitcher'?'stamina':'field'}];
 const e=pick(s,events),p=s.player,health=s.lastGrowth?.healthFactor??developmentHealthFactor(s);
 const add=(key,amount)=>{const before=p.abilities[key];p.abilities[key]=Math.min(Math.max(before,p.potential[key]),before+amount);return p.abilities[key]-before;};
 add(e.key,health);s.news.push(e.text);
 if(developmentRoll(s,'breakout')>=breakoutChance(s))return;
 const style=p.role==='pitcher'?(PITCH_STYLES[p.pitchStyle]||PITCH_STYLES.power):(STYLES[p.style]||STYLES.balanced);
 const pool=[...new Set([e.key,...style.boost])].filter(k=>p.potential[k]-p.abilities[k]>=BREAKOUT.minimumRoom);
 if(!pool.length)return;
 const key=pool[Math.floor(developmentRoll(s,'breakout-key')*pool.length)];
 const amount=BREAKOUT.gainMin+(BREAKOUT.gainMax-BREAKOUT.gainMin)*p.developmentTraits.hiddenBreakout;
 const gains={[key]:add(key,amount*health)};
 if(key!==e.key)gains[e.key]=add(e.key,amount*BREAKOUT.secondaryShare*health);
 s.developmentState.breakoutUntil=developmentTime(s)+BREAKOUT.windowYears;
 recordDevelopmentEvent(s,'BREAKOUT',{reason:'実戦と指導が結びつき、得意な技術で開花',abilities:gains});
 s.timeline.push({year:s.year,age:s.age,text:'実戦経験をきっかけに持ち味が開花。成長の手応えをつかんだ。'});
 s.news.push('実戦経験をきっかけに、得意な技術が伸び始めた。');
}
export const hooks={afterPeriod:[seasonEvent],afterYear:[]};
