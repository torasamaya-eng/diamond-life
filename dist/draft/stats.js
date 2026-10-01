import {clamp} from './random.js';
// Counts first, rates second. Pitching innings are always stored as outs.
export const KEYS=['games','ab','hits','doubles','triples','hr','bb','hbp','so','sf','rbi','sb','outs','er','runs','ha','hra','bba','hbpa','wins','losses','saves','holds'];
export function empty(){return Object.fromEntries(KEYS.map(k=>[k,0]));}
export function sum(rows){const s=empty();for(const r of rows)for(const k of KEYS)s[k]+=r[k]||0;return s;}
export function rates(s){const pa=s.ab+s.bb+s.hbp+s.sf,avg=s.ab?s.hits/s.ab:0,obp=pa?(s.hits+s.bb+s.hbp)/pa:0,slg=s.ab?(s.hits+s.doubles+2*s.triples+3*s.hr)/s.ab:0;return {avg,obp,slg,ops:obp+slg,bbPercent:pa?s.bb/pa*100:0,kPercent:pa?s.so/pa*100:0,era:s.outs?s.er*27/s.outs:0,whip:s.outs?(s.ha+s.bba)*3/s.outs:0,kbb:s.bba?s.so/s.bba:null,baa:(s.outs+s.ha)?s.ha/(s.outs+s.ha):0};}
export const innings=s=>`${Math.floor(s.outs/3)}.${s.outs%3}`;
const bin=(rng,n,p)=>{let v=0;for(let i=0;i<n;i++)if(rng.next()<clamp(p,0,1))v++;return v;};
export function batting(a,games,rng,{difficulty=0,paPerGame=3.7,form=0}={}){
 const s=empty();s.games=games;const pa=Math.round(games*paPerGame),q=k=>(a[k]||50)-difficulty+form;
 s.bb=bin(rng,pa,clamp(.025+q('eye')*.0014,.025,.17));s.hbp=bin(rng,pa-s.bb,.009);s.sf=bin(rng,pa-s.bb-s.hbp,.016);s.ab=pa-s.bb-s.hbp-s.sf;
 s.so=bin(rng,s.ab,clamp(.37-q('contact')*.0028,.08,.38));const balls=s.ab-s.so;
 s.hits=bin(rng,balls,clamp(.20+q('contact')*.0024,.18,.43));s.hr=bin(rng,s.hits,clamp(.004+Math.pow(Math.max(0,q('power'))/100,2.8)*.32,.002,.34));
 s.doubles=bin(rng,s.hits-s.hr,.16+q('power')*.0009);s.triples=bin(rng,s.hits-s.hr-s.doubles,clamp(q('speed')*.0007,0,.08));
 s.rbi=s.hr+bin(rng,s.hits-s.hr,.47)+bin(rng,s.ab-s.hits,.048);s.sb=bin(rng,Math.max(0,s.hits-s.hr+s.bb),clamp((q('speed')-30)*.003,0,.25));return s;
}
export function pitching(a,games,rng,{difficulty=0,ipPerGame=5.4,form=0,role='先発'}={}){
 const s=empty();s.games=games;const q=k=>(a[k]||50)-difficulty+form;s.outs=Math.max(0,Math.round(games*ipPerGame*3));
 s.so=bin(rng,s.outs,clamp(.08+q('stuff')*.004,.10,.52));s.bba=bin(rng,s.outs,clamp(.23-q('control')*.0021,.045,.28));s.hbpa=bin(rng,s.outs,.01);
 s.ha=bin(rng,s.outs,clamp(.51-q('stuff')*.0029,.17,.52));s.hra=bin(rng,s.ha,clamp(.18-q('breaking')*.0013,.045,.20));
 s.er=s.hra+bin(rng,s.ha-s.hra+s.bba+s.hbpa,clamp(.39-q('control')*.0015,.20,.44));s.runs=s.er+bin(rng,s.outs,.012);
 if(role==='先発'){s.wins=bin(rng,games,clamp(.58-rates(s).era*.045,.10,.60));s.losses=bin(rng,games-s.wins,.55);}else if(role==='抑え')s.saves=bin(rng,games,.62);else s.holds=bin(rng,games,.40);return s;
}
// Partition a complete line without manufacturing inconsistent subset totals.
export function split(s,fraction){const left=empty(),right=empty();for(const k of KEYS){left[k]=Math.floor(s[k]*fraction);right[k]=s[k]-left[k];}return [left,right];}
