import {renderCareerNarrative} from './career-narrative.js';
export function careerReview(s){return renderCareerNarrative(s);}
// Lossless storage codec. Daily history is stored once, with column names once per season.
// Runtime still exposes the established records[].dailyRoster and rosterHistory APIs.
export function compactCareerState(state){
 const rosters=[],seen=new Map();
 function copy(value){
  if(!value||typeof value!=='object')return value;
  if(Array.isArray(value.days)&&value.counts&&value.transactions&&value.stage){
   const key=JSON.stringify(value);if(seen.has(key))return {$roster:seen.get(key)};
   const id=rosters.length;seen.set(key,id);
   const {days,...rest}=value,columns=[...new Set(days.flatMap(d=>Object.keys(d)))];
   const missing=days.map(d=>columns.flatMap((k,i)=>d[k]===undefined?[i]:[]));
   rosters.push({...rest,columns,rows:days.map(d=>columns.map(k=>d[k]===undefined?null:d[k])),...(missing.some(x=>x.length)?{missing}:{})});
   return {$roster:id};
  }
  if(Array.isArray(value))return value.map(copy);
  return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,copy(v)]));
 }
 return {...copy(state),codec:'career-rosters-1',rosters};
}
export function expandCareerState(packed){
 if(packed?.codec&&packed.codec!=='career-rosters-1')throw Error('未対応の保存形式です。');
 if(packed?.codec!=='career-rosters-1')return packed;
 if(!Array.isArray(packed.rosters))throw Error('日次保存データが破損しています。');
 const rosters=packed.rosters.map(({columns,rows,missing,...rest})=>{
  if(!Array.isArray(columns)||!Array.isArray(rows))throw Error('日次保存データが破損しています。');
  return {...rest,days:rows.map((row,n)=>{if(!Array.isArray(row)||row.length!==columns.length)throw Error('日次行が破損しています。');return Object.fromEntries(columns.flatMap((k,i)=>missing?.[n]?.includes(i)?[]:[[k,row[i]]]));})};
 });
 function copy(v){if(!v||typeof v!=='object')return v;if(Object.keys(v).length===1&&Number.isInteger(v.$roster)){if(!rosters[v.$roster])throw Error('日次参照が不正です。');return rosters[v.$roster];}return Array.isArray(v)?v.map(copy):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,copy(x)]));}
 const {codec,rosters:stored,...state}=packed;
 return copy(state);
}
export const CAREER_ARCHIVE_VERSION=1;
const archiveFields=['version','careerId','seed','player','year','age','stage','grade','period','team','environmentId','training','scout','salary','totalSalary','totalFirstTeamAllowance','totalSigningBonus','totalSetupAllowance','totalIncentives','proYears','retired','records','tournaments','drafts','nationalHistory','awards','honors','allStars','recordHistory','recordBook','contracts','activeContract','teams','jerseyHistory','timeline','injuries','health','incomeHistory','signingPayments','postingFees','moves','domesticEntry','proEntry','overseasContract','mlbRoster','faDeclarations','careerTypes','postCareer','afterlife','careerPromises','developmentHistory','developmentState','finalCareerAd','newCareerAd'];
export function createCareerArchiveSnapshot(state){
 if(!state?.retired)throw Error('引退後の選手だけ保存できます。');
 const snapshot=Object.fromEntries(archiveFields.filter(k=>state[k]!==undefined).map(k=>[k,state[k]]));
 Object.assign(snapshot,{pending:null,current:state.current,news:[],periodResults:[],marketAttempts:{},contractOffers:[],notices:[],rosterHistory:state.rosterHistory||[],seasonEnvironments:{},archiveVersion:CAREER_ARCHIVE_VERSION,careerReview:careerReview(state)});
 return compactCareerState(snapshot);
}
