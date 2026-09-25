import {developmentOpportunityModifier} from './development.js';
import {FIELDING_KEYS,simulateFielding} from './fielding.js';
import {recordStrength} from './records.js';
import {reliefRole,pitchGameFactor} from './profile.js';
import {clamp,between,integer,random} from './random.js';
export const RAW=[...FIELDING_KEYS,'games','ab','hits','doubles','triples','hr','rbi','sb','bb','hbp','sf','outs','wins','losses','er','allowedHits','allowedWalks','so','saves','holds','rispAb','rispHits','allowedHbp','runsAllowed','allowedHr'];
export const emptyStats=()=>({...Object.fromEntries(RAW.map(k=>[k,0])),detailsKnown:true,fieldingKnown:true,war:0,warKnown:false,defenseRuns:0});
export function sumStats(rows){const out=emptyStats();for(const row of rows){const r=row.stats||row;for(const k of RAW)out[k]+=r[k]||0;}out.fieldingKnown=rows.every(row=>{const st=row.stats||row;return st.fieldingKnown===true||st.games===0;});out.detailsKnown=rows.every(row=>(row.stats||row).detailsKnown===true);out.war=rows.reduce((n,row)=>n+((row.stats||row).war||0),0);out.defenseRuns=rows.reduce((n,row)=>n+((row.stats||row).defenseRuns||0),0);out.warKnown=rows.every(row=>(row.stats||row).warKnown===true||(row.stats||row).games===0);return out;}
export const rate=(n,d)=>d?n/d:0;
export const avg=s=>rate(s.hits,s.ab);
export const obp=s=>rate(s.hits+s.bb+s.hbp,s.ab+s.bb+s.hbp+s.sf);
export const slg=s=>rate(s.hits+s.doubles+2*s.triples+3*s.hr,s.ab);
export const ops=s=>obp(s)+slg(s);
export const era=s=>rate(s.er*27,s.outs);
export const whip=s=>rate((s.allowedHits+s.allowedWalks)*3,s.outs);
export const innings=s=>`${Math.floor(s.outs/3)}.${s.outs%3}`;
export const decimal=n=>n.toFixed(3).replace(/^0/,'');
// Roles and daily registration decide games upstream; this hook adjusts opportunities without rolling rates.
export function statGameOpportunity(s,games){return Math.max(0,Math.round(games*developmentOpportunityModifier(s)));}
export function simulateStats(s,games,difficulty=50){const a=s.player.abilities;const r=emptyStats();r.detailsKnown=true;r.games=statGameOpportunity(s,games);if(!r.games)return r;
 if(s.player.role==='pitcher'){const relief=!['elementary','middle','high'].includes(s.stage)&&reliefRole(s);r.outs=Math.round(r.games*(relief?between(s,2.7,3.8):between(s,15,21)));const skill=(a.control+a.breaking+a.strikeout+a.velocity)/4;const earned=clamp(4.4+(difficulty-skill)*0.057+between(s,-1.1,1.1),0.5,10);r.er=Math.round(r.outs/27*earned);r.allowedHits=Math.round(r.outs/3*clamp(1+(difficulty-skill)*.012+between(s,-.2,.2),.45,2));r.allowedWalks=Math.round(r.outs/3*clamp(.35+(difficulty-a.control)*.007,.1,1));r.so=Math.round(r.outs/3*clamp(.8+(a.strikeout-difficulty)*.013+between(s,-.15,.15),.15,1.8));r.so=Math.min(r.outs,Math.round(r.so*(1+recordStrength(s,'so')*1.25)));if(relief){if(s.player.pitchRole==='closer')r.saves=Math.round(r.games*Math.min(.98,between(s,.45,.7)+recordStrength(s,'saves')*.38));else if(['reliever','setup'].includes(s.player.pitchRole))r.holds=Math.round(r.games*between(s,s.player.pitchRole==='setup'?.45:.3,.65));}const decisions=Math.round(r.games*(relief?.12:.74));r.wins=Math.round(decisions*clamp(.52+(skill-difficulty)*.009+between(s,-.13,.13),.1,.9));r.losses=decisions-r.wins;r.allowedHbp=Math.round(r.outs/3*between(s,.015,.055));r.runsAllowed=r.er+Math.round(r.outs/3*between(s,.015,.12));r.allowedHr=Math.min(r.allowedHits,r.er,Math.round(r.outs/3*clamp(.11+(difficulty-a.breaking)*.0025,.015,.3)));
 }else{const duty=s.player.batterRole,part=!['elementary','middle','high'].includes(s.stage)&&!s.simulatingFarm;const abFactor=part?(duty==='defense'?.9:duty==='runner'?.5:duty==='reserve'?1.8:['pinch','pinchAce'].includes(duty)?1:3.7+recordStrength(s,'hits')*.6):3.6;r.ab=Math.round(r.games*abFactor*between(s,.9,1.1));r.hits=Math.round(r.ab*clamp(.26+(a.meet-difficulty)*.0025+recordStrength(s,'hits')*.12+between(s,-.045,.045),.09,.52));r.hr=Math.min(r.hits,Math.round(r.ab*clamp(.022+(a.power-difficulty)*.001+recordStrength(s,'hr')*.115+between(s,-.012,.012),0,recordStrength(s,'hr')? .19:.115)));r.doubles=Math.min(r.hits-r.hr,Math.round((r.hits-r.hr)*between(s,.14,.25)));r.triples=Math.min(r.hits-r.hr-r.doubles,Math.floor(r.hits*a.speed/2600));r.rbi=r.hr+Math.round((r.hits-r.hr)*between(s,.3,.65)+r.hr*between(s,.3,1.2));r.sb=Math.round(r.games*clamp((a.speed-20)/210,0,.5)*between(s,.5,1.2)*(1+recordStrength(s,'sb')*2.3)*(part&&['pinch','pinchAce'].includes(duty)?.08:1));r.bb=Math.round(r.ab*clamp(.075+(a.eye-difficulty)*.0018,.015,.21));r.hbp=integer(s,0,Math.ceil(r.games/15));r.sf=integer(s,0,Math.ceil(r.games/18));r.so=Math.min(r.ab-r.hits,Math.round(r.ab*clamp(.22+(a.power-a.meet)*.0015+(difficulty-a.eye)*.002,.05,.42)));r.rispAb=Math.round(r.ab*between(s,.2,.3));const minHits=Math.max(0,r.hits-(r.ab-r.rispAb));r.rispHits=clamp(Math.round(r.rispAb*clamp(avg(r)+(a.clutch-50)*.001+between(s,-.04,.04),.05,.6)),minHits,Math.min(r.hits,r.rispAb));}r.defenseRuns=s.player.role==='pitcher'||s.player.position==='dh'?0:((a.field-50)*.28+(a.arm-50)*.06+((a.throwing??a.field)-50)*.06)*r.games/143*(!s.simulatingFarm&&!['elementary','middle','high'].includes(s.stage)?s.player.batterRole==='defense'?.35:s.player.batterRole==='runner'?.15:s.player.batterRole==='reserve'?.5:['pinch','pinchAce'].includes(s.player.batterRole)?.08:1:1);r.warKnown=false;simulateFielding(s,r);return r;}


export const risp=s=>rate(s.rispHits||0,s.rispAb||0);
// Internal production assessment, not WAR. No replacement-player calculation.
export function performance(st,role){if(!st?.games)return 0;if(role==='pitcher'){const ip=st.outs/3;return Math.max(-2,ip/150*(4.5-era(st))*1.3+(st.saves||0)*.065+(st.holds||0)*.04+(st.so||0)*.003-(st.allowedWalks+(st.allowedHbp||0))*.008-(st.allowedHr||0)*.025-Math.max(0,whip(st)-1.1)*ip/200-Math.max(0,(st.runsAllowed||st.er)-st.er)*.01);}return Math.max(-2,(obp(st)+slg(st)-.55)*st.ab/45+st.hr*.035+st.sb*.035+(st.defenseRuns||0)*.07-(st.so||0)*.003+(st.rispAb?risp(st)-.25:0)*2);}

// Specialist value uses first-team production, never ratings or farm totals alone.
export function specialistValue(record,role='batter'){
 if(role!=='batter'||!['defense','runner','pinch','pinchAce'].includes(record.batterRole))return 0;
 const st=record.stats;
 if(!st?.games)return 0;
 const production=record.batterRole==='defense'?Math.max(0,st.defenseRuns||0)/4:record.batterRole==='runner'?Math.max(0,st.sb||0)/25:Math.max(0,obp(st)+slg(st)-.65)*Math.min(st.ab,150)/45;
 return clamp(production,0,1)*clamp(st.games/80,0,1);
}
