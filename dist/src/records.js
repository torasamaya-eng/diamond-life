import {random,clamp} from './random.js';

export const RECORD_TALENT_RATE=1/30;
export const RECORD_TARGETS=[
 {key:'hits',label:'安打',role:'batter',japan:216,world:262},
 {key:'hr',label:'本塁打',role:'batter',japan:60,world:73},
 {key:'sb',label:'盗塁',role:'batter',japan:130,world:138},
 {key:'so',label:'奪三振',role:'pitcher',japan:401,world:513},
 {key:'saves',label:'セーブ',role:'pitcher',japan:54,world:62}
];
// Fixed historical NPB / major-league benchmarks for this fictional world's season records.
// Domestic: https://npb.jp/bis/history/ ; overseas: MLB historical season records.
// "World" compares a single domestic first-team or overseas major-league season, not combined leagues.
export function rollRecordTalent(s){
 // Independent stream preserves the existing genius roll and ordinary career distribution.
 const dice={seed:(s.seed^0x9e3779b9)>>>0};
 if(random(dice)>=RECORD_TALENT_RATE)return;
 const p=s.player;
 p.recordTalent={mode:random(dice)<.35?'multi':'single',focus:Math.floor(random(dice)*6)};
 p.arc=p.recordTalent.mode==='multi'?'recordMulti':'recordSingle';
 p.talent=Math.max(p.talent,p.recordTalent.mode==='multi'?1.85:1.65);
 for(const k in p.abilities){p.abilities[k]=clamp(p.abilities[k]+8,5,99);p.potential[k]=Math.max(p.potential[k],p.recordTalent.mode==='multi'||['meet','power','speed','strikeout','control'].includes(k)?99:90);}
 s.news.push(p.recordTalent.mode==='multi'?'複数の分野に、球史を変えるかもしれない才能の片鱗。':'一つの分野で、記録に挑めるほどの才能の片鱗。');
}
export function recordStrength(s,key){
 const t=s.player.recordTalent;
 if(!t||s.simulatingFarm||!['pro','mlb'].includes(s.stage)||s.age<19)return 0;
 const keys=s.player.role==='pitcher'?['so','saves']:['hits','hr','sb'];
 if(t.mode!=='multi'&&keys[t.focus%keys.length]!==key)return 0;
 const ability={hits:'meet',hr:'power',sb:'speed',so:'strikeout',saves:'control'}[key];
 return clamp((s.player.abilities[ability]-78)/18,0,1);
}
export function checkSeasonRecords(s,r){
 if(!['pro','mlb'].includes(r.stage)||r.partial)return;
 s.recordBook??={};s.recordHistory??=[];
 for(const target of RECORD_TARGETS.filter(t=>t.role===s.player.role)){
  for(const scope of r.stage==='pro'?['japan','world']:['world']){
   const id=scope+':'+target.key,previous=s.recordBook[id]??target[scope],value=r.stats[target.key]||0;
   if(value<=previous)continue;
   const title=(scope==='japan'?'日本':'世界')+'シーズン記録更新：'+target.label;
   s.recordBook[id]=value;
   const entry={id,year:r.year,age:r.age,team:r.team,title,value,previous};
   s.recordHistory.push(entry);s.honors??=[];s.honors.push({...entry});
   const text=title+' '+value+'（従来 '+previous+'）';
   s.news.push('獲得：'+text);s.timeline.push({year:r.year,age:r.age,text});
  }
 }
}
