import {between,clamp} from './random.js';
export const FIELDING_KEYS=['fieldGames','putouts','assists','errors','doublePlays','throwingErrors'];
// Expected opportunities per full game, independent of batting opportunities.
export const FIELDING_POSITIONS={
 first:{po:8.5,a:.6,dp:.75},second:{po:2,a:3,dp:.65},
 third:{po:.7,a:1.9,dp:.2},shortstop:{po:1.5,a:3.1,dp:.65},
 left:{po:1.8,a:.04,dp:.015},center:{po:2.5,a:.04,dp:.015},
 right:{po:1.9,a:.07,dp:.02},catcher:{po:7.5,a:.5,dp:.07},
 pitcher:{po:.12,a:1.1,dp:.08}
};
export const fieldingRate=st=>{
 const total=(st.putouts||0)+(st.assists||0)+(st.errors||0);
 return st.fieldingKnown===true&&total>0?((st.putouts||0)+(st.assists||0))/total:null;
};
export function ensureThrowing(s){
 const p=s.player;if(!p?.abilities)return;
 // Stable backfill and a distinct aptitude, without consuming the career RNG.
 if(p.abilities.throwing===undefined)p.abilities.throwing=clamp((p.abilities.field??20)+((s.seed>>>0)%17)-8,5,99);
 if(p.potential&&p.potential.throwing===undefined)p.potential.throwing=Math.max(p.abilities.throwing,p.genius?95:5,clamp((p.potential.field??80)+((s.seed>>>0)%13)-6,5,99));
}
export function simulateFielding(s,st){
 const p=s.player,pitch=p.role==='pitcher',position=pitch?'pitcher':s.simulatingFarm?(p.naturalPosition||p.position):p.position;
 const config=FIELDING_POSITIONS[position];
 st.fieldingKnown=true;for(const key of FIELDING_KEYS)st[key]=0;
 if(!config||!st.games)return st;
 const partial=!s.simulatingFarm&&!['elementary','middle','high'].includes(s.stage);
 const role=partial?p.batterRole:'regular';
 const participation=pitch?1:role==='runner'?.35:['pinch','pinchAce'].includes(role)?.15:1;
 st.fieldGames=Math.min(st.games,Math.round(st.games*participation));
 const fullGames=pitch?st.outs/27:st.fieldGames*(role==='defense'?.3:['runner','pinch','pinchAce'].includes(role)?.25:role==='reserve'?.5:1);
 // Separate stream: adding fielding stats does not reroll injuries, batting or contracts.
 const dice={seed:(s.seed^0x51f15e)>>>0};
 const a=p.abilities,accuracy=a.throwing??a.field;
 const armFactor=clamp(.5+a.arm/100,.5,1.49),throwFactor=clamp(.65+accuracy/140,.65,1.36);
 const outfield=['left','center','right'].includes(position);
 const poChances=Math.round(fullGames*config.po*between(dice,.85,1.15));
 const throwChances=Math.round(fullGames*config.a*(outfield?armFactor:1)*between(dice,.85,1.15));
 const catchErrors=Math.min(poChances,Math.round(poChances*clamp(.025-a.field*.00023,.002,.025)*between(dice,.65,1.4)));
 st.throwingErrors=Math.min(throwChances,Math.round(throwChances*clamp(.065-accuracy*.00062,.003,.065)*between(dice,.65,1.4)));
 st.errors=catchErrors+st.throwingErrors;
 st.putouts=poChances-catchErrors;
 st.assists=throwChances-st.throwingErrors;
 st.doublePlays=Math.min(st.putouts+st.assists,Math.round(fullGames*config.dp*armFactor*throwFactor*between(dice,.7,1.3)));
 return st;
}
