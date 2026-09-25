import {developmentTrait} from './development.js';
import {DECLINE} from './balance.js';
import {CAREER_BALANCE} from './balance.js';
import {managerEligible,careerPromise,directOverseasProspect} from './career-rules.js';
import {performance,specialistValue} from './stats.js';
import {negotiate,eligibility,postingApproved} from './market.js';
import {salaryEstimate} from './contracts.js';
import {random,pick} from './random.js';
import {TEAMS,migrateTeamNames,STAFF_ROLES} from './data.js';
import {SALARY_MODEL} from './contracts.js';
export function reviewEmployment(s,record){
 if(s.age>=SALARY_MODEL.maxAge||s.activeContract?.endYear>s.year||s.contractOffers?.some(o=>o.id==='rehab'))return;
 const volume=s.player.role==='pitcher'?record.stats.outs/3:record.stats.games,merit=performance(record.stats,s.player.role),overseas=s.stage==='mlb';
 const early=s.proYears>=2&&s.proYears<=6&&['brief','lostStar'].includes(s.player.arc)&&merit<.5;
 const recent=s.records.filter(r=>['pro','mlb'].includes(r.stage)&&!r.partial).slice(-CAREER_BALANCE.struggleSeasons);
 const stalled=recent.length===CAREER_BALANCE.struggleSeasons&&recent.every(r=>performance(r.stats,s.player.role)<CAREER_BALANCE.struggleMerit&&(s.player.role==='pitcher'?r.stats.outs/3<CAREER_BALANCE.strugglePitchInnings:r.stats.games<CAREER_BALANCE.struggleBatterGames));
 const usefulSpecialist=specialistValue(record,s.player.role)>=.35&&volume>=45;
 const decline=!usefulSpecialist&&(early||stalled||record.overall<(overseas?62:47)||(s.age>=35&&(record.overall<(overseas?73:64)||merit<0)&&volume<(overseas?75:55)));
 const veteran=s.age>=32&&s.proYears>=5;
 const firstWarning=decline&&veteran&&(!s.staffWarning||s.staffWarning.team!==s.team);
 const released=!firstWarning&&decline&&random(s)<(overseas?.88:.65)*(1+(s.age>=35?.5-developmentTrait(s,'longevity'):0)*DECLINE.employmentLongevityWeight);
 const coach=firstWarning||veteran&&record.overall<66&&random(s)<.35;
 if(!released&&!coach)return;
 const direct=overseas&&directOverseasProspect(s),attentionBonus=direct?(s.age<=35?.25:.1):0;
 const domesticReemployment=s.stage!=='independent'||s.records.some(r=>['pro','mlb'].includes(r.stage));
 const from=s.team,options=[],renewal=s.contractOffers?.[0]?.annual||s.salary;
 if(firstWarning)s.staffWarning={year:s.year,team:from};
 if(!released)options.push({id:'stay',team:from,stage:s.stage,salary:renewal,role:'player'});
 if(released){if(domesticReemployment&&(!stalled||record.overall>=CAREER_BALANCE.trialRating)&&record.overall>=39&&random(s)<(overseas?Math.min(.98,.35+Math.max(0,merit)*.12+attentionBonus):.5)){const count=overseas&&merit>=2?3:direct?2:1;let pool=TEAMS.filter(t=>t!==from);for(let i=0;i<count;i++){const team=pick(s,pool);pool=pool.filter(t=>t!==team);const pricing={...s,stage:'pro',salary:Math.min(s.salary,30000),contractStatus:'registered'};const pay=salaryEstimate(pricing,record,true);s.seed=pricing.seed;options.push({id:'trial'+(i||''),team,stage:'pro',salary:direct?Math.max(s.age<=35?2000:1000,Math.round(pay*(1+attentionBonus)/10)*10):Math.max(600,pay),years:merit>=3?2:1,role:'player',attention:direct?'海外大学から直接プロ入りした注目選手として評価':null});}}if(domesticReemployment&&(!stalled||s.proYears<=CAREER_BALANCE.developmentYears||s.health?.daysLeft>0)&&record.overall>=30&&record.overall<60)options.push({id:'development',team:pick(s,TEAMS.filter(t=>t!==from)),stage:'pro',salary:300,role:'player',development:true});if(record.overall>=25&&random(s)<.65)options.push({id:'indie',team:'信濃リバーストーンズ',stage:'independent',salary:180,role:'player'});options.push({id:'amateur',team:'東都モータース',stage:'corporate',salary:0,role:'player'});}
 if(coach||released){for(const role of ['academy','staff'])options.push({id:role,team:from,stage:s.stage,salary:STAFF_ROLES[role].salary,role});}
 if(coach){options.push({id:'coach',team:from,stage:s.stage,salary:1200,role:'coach'});if(managerEligible(s,from))options.push({id:'manager',team:from,stage:s.stage,salary:6000,role:'manager'});}
 for(const raw of (s.careerPromises||[]).slice(-1)){const promise=careerPromise(s,raw);const id='promised-'+promise.role;options.push({id,team:promise.team,stage:'pro',salary:promise.role==='manager'?6000:1200,role:promise.role,guaranteed:true});}
 if(direct&&released)s.news.push('海外大学から直接プロ入りした経歴を国内球団が注目。復帰交渉で評価が加算されます。');
 s.employment={year:s.year+1,type:released?'released':'coach',from,options,warning:firstWarning,strict:overseas};
 s.timeline.push({year:s.year,text:released?from+'から自由契約通告':from+'から指導者への転身を打診。現役続行後に成績が戻らなければ自由契約の可能性'});
 s.news.push(released?'自由契約：'+from+'との選手契約が終了。':'コーチ・監督への転身の話が届いた。現役続行も選べます。');
 if(released){s.team='自由契約';s.salary=0;s.activeContract=null;}s.contractOffers=[];s.retirementAdvice=null;
}
export function queueMarketNotices(s){if(s.retired||s.employment)return;if(s.stage==='mlb'){if(!eligibility(s,'mlbFa')&&!s.notices.some(n=>n.kind==='mlbFa'&&n.year===s.year))s.notices.push({kind:'mlbFa',year:s.year,seen:false,title:'メジャーFAの交渉が可能です',body:'メジャー登録・負傷者リストの在籍が6年分に到達しています。'});return;}if(s.stage!=='pro')return;const years=s.records.filter(r=>r.stage==='pro').length;const rating=Math.round(Object.values(s.player.abilities).reduce((a,b)=>a+b,0)/Object.keys(s.player.abilities).length);const entries=[];for(const kind of ['fa','overseasFa'])if(!eligibility(s,kind)&&!s.noticeFlags[kind])entries.push({kind,title:kind==='fa'?'国内FA権を取得しました':'海外FA権を取得しました',body:kind==='fa'?'国内球団と交渉できます。宣言すると残留しても再取得に一軍登録4シーズンが必要です。':'球団承認なしで国内・海外球団と交渉できます。宣言残留でも再取得に一軍登録4シーズンが必要です。'});const approvalKey=postingApproved(s)?s.postingChallenge.year+':'+s.postingChallenge.team:null;if(!s.postingReport&&!eligibility(s,'posting')&&(!s.noticeFlags.posting||approvalKey&&s.noticeFlags.postingApproval!==approvalKey)){entries.push({kind:'posting',title:approvalKey?'課題達成・ポスティング申請が可能です':'海外挑戦のチャンス',body:approvalKey?'球団承認を獲得しました。複数年契約中でも海外球団の条件を確認できます。':'ポスティングを申請できます。複数年契約中でも球団承認を得れば海外交渉へ進めます。'});if(approvalKey)s.noticeFlags.postingApproval=approvalKey;}const last=s.records.at(-1),prev=s.records.at(-2);const down=last&&prev&&(last.overall<prev.overall-2||performance(last.stats,s.player.role)<performance(prev.stats,s.player.role)-1.5);const cooling=s.moves.some(m=>m.kind==='trade'&&s.year-m.year<3)||s.year-(s.lastTradeNoticeYear||0)<3;if(!cooling&&!eligibility(s,'trade')&&random(s)<(down?.08:.012)){const board=negotiate(s,'trade',true);s.market=null;entries.push({kind:'trade',team:board.offers[0]?.team,title:down?'復活を期待するトレード打診':'電撃トレードの打診',body:(board.offers[0]?.team||'球団')+'から具体的なトレード条件が届きました。移籍先と年俸を確認できます。'});s.lastTradeNoticeYear=s.year;}for(const n of entries){s.notices.push({...n,year:s.year,seen:false});if(n.kind!=='trade')s.noticeFlags[n.kind]=true;}}
export function migrateCareer(s){migrateTeamNames(s);if(s.activeContract===undefined)s.activeContract=(['pro','mlb','independent'].includes(s.stage)?{team:s.team,startYear:s.year,endYear:s.year,years:1,annual:s.salary,type:'既存契約'}:null);s.contractOffers??=[];s.employment??=null;s.notices??=[];s.noticeFlags??={};s.player.genius??=false;s.postCareer??=null;s.careerPromises??=[];s.contractStatus??=s.stage==='pro'&&s.salary<SALARY_MODEL.npbFloor?'development':'registered';s.injuries??=[];s.incomeHistory??=[];s.totalIncentives??=0;if(s.activeContract&&!s.retired&&s.age<=SALARY_MODEL.maxAge){s.activeContract.endYear=Math.min(s.activeContract.endYear,s.year+SALARY_MODEL.maxAge-s.age);s.activeContract.years=s.activeContract.endYear-s.activeContract.startYear+1;}s.contractOffers=s.contractOffers.map(o=>({...o,years:Math.min(o.years,Math.max(1,SALARY_MODEL.maxAge-s.age+1))}));if(s.age>SALARY_MODEL.maxAge&&!s.retired){s.retired=true;s.pending=null;s.contractOffers=[];s.employment=null;s.timeline.push({year:s.year,text:'年齢上限50歳へのルール変更により現役終了（過去の記録は保持）'});}return s;}
