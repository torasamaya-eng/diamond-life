import {developmentSalaryModifier} from './development.js';
import {incentiveOffer} from './finance.js';
import {clamp,between,integer,random} from './random.js';
import {avg,era,performance,specialistValue} from './stats.js';
import {money} from './format.js';
export const SALARY_ANCHORS={rookieBreakout:7000,thirdYearStar:12000,fourthYearStar:23000,establishedStar:[25000,60000],development:[240,500],source:'https://www.gurazeni.com/player/1988',reviewed:'2026-09-22'};
// Unit: ten thousand JPY. Historical anchors, not a claim about current market prices.
export const SALARY_MODEL={npbFloor:420,developmentFloor:240,npbCap:120000,mlbFloor:11400,mlbCap:600000,geniusChance:1/30,maxAge:50,earlyExperience:[.40,.68,1.0]};
export const SALARY_SOURCES=[
 {label:'グラゼニ.com：2026年推定年俸ランキング',url:'https://www.gurazeni.com/'},
 {label:'グラゼニ.com：牧秀悟の年俸・年度成績（1300→7000→12000→23000万円）',url:'https://www.gurazeni.com/player/1988'},
 {label:'グラゼニ.com：DeNAの支配下・育成の年俸分布',url:'https://www.gurazeni.com/team/6'},
 {label:'日本プロ野球選手会・2026年年俸調査（平均5,216万円、中央値2,000万円）',url:'https://jpbpa.net/2026/04/27/13002/'},
 {label:'日本プロ野球選手会・2025年年俸調査（平均4,905万円、中央値1,900万円）',url:'https://jpbpa.net/2025/04/21/12358/'},
 {label:'MLB公式・山本由伸の12年3億2,500万ドル契約',url:'https://www.mlb.com/news/yoshinobu-yamamoto-dodgers-free-agent-deal'},
 {label:'MLB公式・村上宗隆の2年3,400万ドル契約',url:'https://www.mlb.com/ja/news/munetaka-murakami-white-sox-contract'}
];
// Context is read-only: do not count farm/representative production as first-team records.
export function salaryAssessmentContext(s,record,market=false){return {stats:record.stats,record,age:s.age,stage:s.stage,previousSalary:s.salary,contract:s.activeContract,market,recentSeasons:s.records.filter(r=>r.stage===s.stage&&!r.partial).slice(-3)};}
export function salaryEstimate(s,record,market=false){
 const {stats:st}=salaryAssessmentContext(s,record,market),pitcher=s.player.role==='pitcher',relief=pitcher&&(record.pitchRole||s.player.pitchRole)!=='starter';
 const volume=clamp(pitcher?st.outs/(relief?180:450):st.ab/480,0,1.3);
 const merit=performance(st,s.player.role);
 const seasons=s.records.filter(r=>['pro','mlb'].includes(r.stage));
 const years=Math.max(seasons.length,s.proYears||0);
 const experience=years<=3?SALARY_MODEL.earlyExperience[Math.max(0,years-1)]:Math.min(1.3,1.05+(years-4)*.045);
 let target=SALARY_MODEL.npbFloor+volume*2000+Math.max(0,merit)*2600+Math.max(0,merit-3)*4500;
 if(pitcher)target+=(st.saves||0)*180+(st.holds||0)*100;
 else {target+=st.hr*90;target+=specialistValue(record,s.player.role)*1800;if(['defense','runner','pinch','pinchAce'].includes(record.batterRole)&&st.ab<200)target=Math.min(target,6000);}
 target*=experience*between(s,.94,1.06);
 target*=developmentSalaryModifier(s,record,market);
 if(!pitcher&&['defense','runner','pinch','pinchAce'].includes(record.batterRole)&&st.ab<200)target=Math.min(target,6000);
 if(s.stage==='independent')target=180+volume*220+Math.max(0,merit)*35;
 if(s.stage==='mlb')target=Math.max(SALARY_MODEL.mlbFloor,target*7.5);
 if(s.stage==='pro'&&s.contractStatus==='development')return Math.round(clamp(SALARY_MODEL.developmentFloor+volume*150+Math.max(0,merit)*30,SALARY_MODEL.developmentFloor,500)/10)*10;
 const floor=s.stage==='mlb'?SALARY_MODEL.mlbFloor:s.stage==='independent'?180:SALARY_MODEL.npbFloor;
 const cap=s.stage==='mlb'?SALARY_MODEL.mlbCap:s.stage==='independent'?1200:SALARY_MODEL.npbCap;
 if(!market)target*=1+Math.min(.1,s.clubTrust?.[s.team]||0);
 if(!market)target=target>=s.salary?target*.85+s.salary*.15:s.stage==='mlb'?target*.8+s.salary*.2:target*.45+s.salary*.55;
 return Math.round(clamp(target,floor,cap)/10)*10;
}
export function setContract(s,annual,years=1,type='更改',guarantees=null,incentive=null){years=Math.min(years,SALARY_MODEL.maxAge-s.age+1);if(s.stage==='pro')annual=Math.max(s.contractStatus==='development'?SALARY_MODEL.developmentFloor:SALARY_MODEL.npbFloor,annual);s.salary=annual;s.activeContract={team:s.team,startYear:s.year,endYear:s.year+years-1,years,annual,type,guarantees,incentive};s.contractOffers=[];}
export function prepareRenewal(s,record){if(s.age>=SALARY_MODEL.maxAge)return;const active=s.activeContract;if(active&&active.endYear>s.year){s.salary=active.annual;s.contracts.push({year:s.year,team:s.team,salary:record.salary,nextSalary:s.salary,roster:record.roster,yearsLeft:active.endYear-s.year});s.news.push(`複数年契約は残り${active.endYear-s.year}年。来季も年俸${money(s.salary)}。`);return;}const annual=salaryEstimate(s,record);s.contracts.push({year:s.year,team:s.team,salary:record.salary,nextSalary:annual,roster:record.roster,yearsLeft:0});if(s.stage==='independent'){s.salary=annual;return;}s.contractOffers=[{id:'one',annual,years:1,year:s.year+1}];if(record.overall>=65&&s.age<36&&random(s)<.7){const years=record.overall>=85?integer(s,3,s.stage==='mlb'?7:5):integer(s,2,3);s.contractOffers.push({id:'multi',annual:Math.round(annual*.92/10)*10,years:Math.min(years,SALARY_MODEL.maxAge-s.age),year:s.year+1,incentive:incentiveOffer(s,annual,years)});}if(s.stage==='pro'&&s.contractStatus!=='development'&&s.health?.daysLeft>=90){s.contractOffers.push({id:'rehab',annual:Math.max(SALARY_MODEL.developmentFloor,Math.min(annual,500)),years:1,year:s.year+1,development:true,reason:s.health.name+'の長期リハビリに専念。復帰後は支配下登録を目指します。'});s.news.push('長期離脱を考慮し、育成契約でのリハビリも打診されました。支配下での続行も選べます。');}s.news.push('球団から来季の契約条件が届きました。');}
export function signRenewal(s,id){const o=s.contractOffers.find(x=>x.id===id);if(!o||o.year!==s.year||s.retired||s.employment)throw Error('有効な契約提示がありません。');if(o.development)s.contractStatus='development';setContract(s,o.annual,o.years,o.development?'育成・リハビリ':'更改',null,o.incentive||null);const last=s.contracts.at(-1);if(last){last.nextSalary=o.annual;last.yearsLeft=o.years;}s.timeline.push({year:s.year,text:`${o.development?'長期療養のため育成契約を選択。':''}${o.years}年契約に合意。年俸${money(o.annual)}・総額${money(o.annual*o.years)}`});}
