import {createPlayer,choose,advanceYear} from '../dist/src/engine.js';
import {emptyStats} from '../dist/src/stats.js';
import {setContract,prepareRenewal} from '../dist/src/contracts.js';
import {draft} from '../dist/src/draft.js';
export function reportedRenewal(){
 const s=createPlayer('再現選手','batter',713);Object.assign(s,{stage:'pro',age:25,year:2033,salary:4400,proYears:4,team:'東京クラウンズ'});
 for(const k in s.player.abilities){s.player.abilities[k]=78;s.player.potential[k]=90;}s.player.batterRole='regular';setContract(s,4400);
 s.health={name:'疲労骨折',daysLeft:150,totalDays:180,severe:false};
 const record={year:s.year,team:s.team,stage:s.stage,age:s.age,salary:s.salary,overall:78,stats:{...emptyStats(),games:120,ab:450,hits:129,doubles:25,hr:18,bb:50,sb:10,rbi:65},awards:[]};
 prepareRenewal(s,record);return s;
}
export function graduate(stage='overseas',seed=731){
 const s=createPlayer('進路再現','batter',seed);Object.assign(s,{stage,grade:stage==='high'?3:4,age:stage==='high'?18:22,year:2030,scout:99,environmentId:stage==='high'?'mirai':stage});
 for(const k in s.player.abilities){s.player.abilities[k]=99;s.player.potential[k]=99;}
 s.player.arc='ordinary';s.records=[{year:s.year,age:s.age,stage,grade:s.grade,team:s.team,salary:0,stats:{...emptyStats(),games:60,ab:220,hits:100,hr:30,bb:40},overall:99}];s.teams.push({year:s.year-3,team:s.team,stage});return s;
}
export function draftOffer(s){for(let tries=0;tries<100;tries++){const d=draft(s);if(d.type==='支配下'){s.pending={type:'career',draft:d};return d;}}throw Error('No domestic offer');}
