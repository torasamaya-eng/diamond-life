import {mlbService} from './roster.js';
import {faService,faRemaining,declareFA,finishFA} from './free-agency.js';
import {performance} from './stats.js';
import {incentiveOffer} from './finance.js';
import {assignNumber} from './profile.js';
import {TEAMS,teamName,OVERSEAS_LEAGUES} from './data.js';
import {overall} from './growth.js';
import {random,pick,integer} from './random.js';
import {money} from './format.js';
import {salaryEstimate,setContract,SALARY_MODEL} from './contracts.js';
export const MARKET_RULES={postingYears:5,postingAbility:75};
export const MLB_TEAMS=OVERSEAS_LEAGUES.flatMap(l=>l.teams);
export const postingApproved=s=>s.postingChallenge?.status==='achieved'&&teamName(s.postingChallenge.team)===teamName(s.team);
export function eligibility(s,kind){if(s.retired)return '引退後は交渉できません。';if(s.employment)return '戦力外・コーチの打診への回答を先に選んでください。';if(s.pending)return '先に進路を選んでください。';if(kind==='mlbFa'){if(s.stage!=='mlb')return '海外球団所属中の制度です。';if(s.activeContract?.endYear>s.year)return '複数年契約の期間中です。';if(s.moves.some(m=>m.year===s.year))return '今年の移籍は決定済みです。';return mlbService(s)>=6*172?'':'メジャーFAまであと'+(6*172-mlbService(s))+'登録日（172日で1年）です。';}if(s.stage!=='pro')return '国内プロ球団に所属している選手が対象です。';if(s.moves.some(m=>m.year===s.year))return '今年の移籍は決定済みです。';if(['fa','overseasFa'].includes(kind)&&s.activeContract?.endYear>s.year)return '複数年契約の期間中です。満了年に申請できます。';if(kind==='trade'&&s.moves.some(m=>m.kind==='trade'&&s.year-m.year<3))return 'トレード後は3年間、現在の球団でプレーします。';const years=s.records.filter(r=>r.stage==='pro').length;if(['fa','overseasFa'].includes(kind)){const declared=s.faDeclarations?.at(-1);if(declared?.year===s.year){if(declared.kind!==kind||declared.outcome!=='交渉中')return '今季のFA権は行使済みです。';}else {const rights=faService(s),days=kind==='fa'?rights.domesticDays:rights.overseasDays;if(days)return (kind==='fa'?'国内FA：':'海外FA：')+faRemaining(days)+'（一軍登録日数）';}}if(kind==='posting'&&years<MARKET_RULES.postingYears)return `ポスティング申請まで国内プロあと${MARKET_RULES.postingYears-years}年。`;if(kind==='posting'&&s.postingChallenge?.status==='pending'&&teamName(s.postingChallenge.team)===teamName(s.team))return '球団承認の条件：'+s.postingChallenge.label+'（達成後に申請可能）';if(kind==='posting'&&!postingApproved(s)&&overall(s)<MARKET_RULES.postingAbility)return `海外球団の評価目安は総合能力${MARKET_RULES.postingAbility}以上です。`;if(!['trade','fa','overseasFa','posting'].includes(kind))return '不明な交渉です。';return '';}
export function negotiate(s,kind,inbound=false){const reason=eligibility(s,kind);if(reason)throw Error(reason);const key=`${s.year}:${kind}`;const cached=s.marketAttempts[key];const newlyApproved=kind==='posting'&&postingApproved(s)&&cached&&(cached.permissionGranted===false||cached.permissionGranted===undefined&&cached.message.includes('申請を拒否'));if(cached&&!newlyApproved){s.market=cached;return s.market;}if(['fa','overseasFa'].includes(kind))declareFA(s,kind);const score=overall(s);const pricing={...s,stage:kind==='posting'?'mlb':'pro'};const last=s.records.at(-1);const production=Math.max(0,performance(last?.stats,s.player.role));const interest=production>=5?integer(s,4,6):production>=2?integer(s,2,4):integer(s,1,2);const label={trade:'トレード',fa:'国内FA',overseasFa:'海外FA',mlbFa:'メジャーFA',posting:'ポスティング'}[kind];const board={year:s.year,kind,offers:[],message:'',closed:false};const permission=kind!=='posting'||postingApproved(s)||random(s)<.6;board.permissionGranted=permission;if(!permission){s.postingChallenge=createPostingChallenge(s);board.message='球団は申請を拒否。条件「'+s.postingChallenge.label+'」を達成すれば、シーズン終了後の申請を承認すると約束しました。';}else if(!inbound&&random(s)>(kind==='posting'?Math.min(.94,.72+(s.overseasExposure||0)*.045):Math.min(.96,.13+score/180+production*.075)))board.message='条件の合うオファーは届きませんでした。今の球団で現役を続けられます。';else{let pool=(kind==='posting'?MLB_TEAMS:['overseasFa','mlbFa'].includes(kind)?[...MLB_TEAMS,...TEAMS]:TEAMS).filter(t=>t!==teamName(s.team));for(let i=0;i<(kind==='trade'?1:['fa','overseasFa','mlbFa'].includes(kind)?interest:2);i++){const candidates=['overseasFa','mlbFa'].includes(kind)?pool.filter(t=>i%2===0?MLB_TEAMS.includes(t):TEAMS.includes(t)):pool;const team=pick(s,candidates.length?candidates:pool);const overseas=MLB_TEAMS.includes(team);pool=pool.filter(t=>t!==team);const guarantees=['fa','overseasFa','mlbFa'].includes(kind)?faBenefits(s,i,production):kind==='trade'?s.activeContract?.guarantees||null:null;board.offers.push({guarantees,id:`${key}:${i}`,team,stage:overseas?'mlb':'pro',salary:kind==='trade'?s.salary:Math.round(salaryEstimate({...pricing,stage:overseas?'mlb':'pro'},last,true)*integer(s,95,115)/100),years:Math.min(SALARY_MODEL.maxAge+1-s.age,kind==='trade'?Math.max(1,(s.activeContract?.endYear??s.year)-s.year+1):score>=85?integer(s,3,overseas?8:5):integer(s,['fa','overseasFa','mlbFa'].includes(kind)?2:1,3)),role:guarantees?.regular?'レギュラー確約':score>=70?'主力候補':'競争枠'});board.offers.at(-1).incentive=kind==='trade'?s.activeContract?.incentive||null:incentiveOffer(s,board.offers.at(-1).salary,board.offers.at(-1).years);if(guarantees?.careerRole)board.offers.at(-1).salary=Math.round(board.offers.at(-1).salary*.94/10)*10;}board.message=kind==='trade'?'球団間の調整が成立。移籍先を確認して決めてください。':'提示された年俸を比べて、移籍か残留を選べます。';}s.marketAttempts[key]=board;s.market=board;s.timeline.push({year:s.year,text:`${label}交渉：${board.offers.length?board.offers.length+'球団からオファー':board.message}`});return board;}
export function acceptOffer(s,id){const b=s.market;if(!b||b.closed||b.year!==s.year)throw Error('このオファーは有効ではありません。');const reason=eligibility(s,b.kind);if(reason)throw Error(reason);const offer=b.offers.find(o=>o.id===id);if(!offer?.team||!offer.stage)throw Error('オファーが見つかりません。');const from=s.team;s.team=offer.team;s.stage=offer.stage;s.salary=offer.salary;s.grade=1;s.environmentId=null;setContract(s,offer.salary,offer.years||1,b.kind,offer.guarantees||null,offer.incentive||null);s.contractStatus='registered';if(s.stage==='mlb'&&s.mlbRoster){s.mlbRoster.on40=true;s.mlbRoster.outrightYear=null;s.mlbRoster.reviewYear=null;}if(offer.guarantees?.careerRole){s.careerPromises??=[];s.careerPromises.push({year:s.year,team:s.team,role:offer.guarantees.careerRole});}const label={trade:'トレード',fa:'国内FA',overseasFa:'海外FA',mlbFa:'メジャーFA',posting:'ポスティング'}[b.kind];s.moves.push({year:s.year,kind:b.kind,from,to:s.team,salary:s.salary});s.teams.push({year:s.year,stage:s.stage,team:s.team,from});s.timeline.push({year:s.year,text:`${label}で${s.team}へ移籍。年俸${money(s.salary)}`});if(['fa','overseasFa'].includes(b.kind))finishFA(s,s.team+'へ移籍');s.news=[`${s.team}への移籍が決定。今季年俸${money(s.salary)}。`];assignNumber(s);b.closed=true;if(s.marketAttempts[b.year+':'+b.kind])s.marketAttempts[b.year+':'+b.kind].closed=true;s.market=null;}
export function remain(s){if(s.market&&!s.market.closed&&s.market.year===s.year){if(['fa','overseasFa'].includes(s.market.kind)){finishFA(s,'宣言残留');s.clubTrust??={};s.clubTrust[s.team]=Math.min(.10,(s.clubTrust[s.team]||0)+.05);const last=s.records.at(-1);if(last){const annual=salaryEstimate(s,last);s.contractOffers=[{id:'one',annual,years:1,year:s.year},{id:'multi',annual,years:Math.min(2,51-s.age),year:s.year}];}s.news.push('FA宣言残留：球団の信頼が上がり、残留先での年俸査定を優遇。契約条件を確認してください。');s.timeline.push({year:s.year,text:'FA宣言残留。球団の信頼が上昇（査定優遇 '+Math.round(s.clubTrust[s.team]*100)+'%）'});}s.market.closed=true;if(s.marketAttempts[s.market.year+':'+s.market.kind])s.marketAttempts[s.market.year+':'+s.market.kind].closed=true;s.timeline.push({year:s.year,text:`${s.team}への残留を選択`});}s.market=null;}
export function retirementReview(s,record){if(s.age<32||s.year-s.lastAdviceYear<2)return;const poor=record.overall<52||record.stats.games<(s.player.role==='pitcher'?8:30);if(!poor&&!(s.age>=38&&record.overall<68))return;s.lastAdviceYear=s.year;s.retirementAdvice={year:s.year,reason:poor?'出場機会と成績が落ち、球団から引退を勧められました。':'ベテランとしての役割を話し合う中で、球団から引退を勧められました。',answered:false};s.timeline.push({year:s.year,text:'球団から引退勧告。続行か引退かを自分で選ぶ。'});}

export const POSTING_CHALLENGE_RULES={types:['stats','league','japan','title','years'],waitMin:1,waitMax:3};
export function createPostingChallenge(s){
 const type=pick(s,POSTING_CHALLENGE_RULES.types),pitch=s.player.role==='pitcher',relief=pitch&&s.player.pitchRole!=='starter';
 const c={year:s.year,team:s.team,type,status:'pending',target:1};
 if(type==='stats')Object.assign(c,{stat:pitch?(relief?'savesHolds':'so'):'hr',target:pitch?(relief?30:150):25,label:'今季の一軍で'+(pitch?(relief?'セーブ＋ホールド30以上':'奪三振150以上'):'本塁打25本以上')});
 if(type==='league')c.label='今季、所属球団がリーグ優勝';
 if(type==='japan')c.label='今季、所属球団が日本一';
 if(type==='title')c.label='今季、個人タイトル・表彰を1つ以上獲得（ベストナイン・GG賞を含む）';
 if(type==='years'){const years=integer(s,POSTING_CHALLENGE_RULES.waitMin,POSTING_CHALLENGE_RULES.waitMax);c.eligibleYear=s.year+years-1;c.label='現在の球団にあと'+years+'シーズン在籍（'+c.eligibleYear+'年シーズン終了後に許可）';}
 return c;
}
export function reviewPostingChallenge(s,r){
 const c=s.postingChallenge;
 if(!c||c.status!=='pending'||r.partial||(r.stage&&r.stage!=='pro')||teamName(c.team)!==teamName(r.team)||teamName(c.team)!==teamName(s.team))return;
 if(c.type==='years'?r.year<c.year:c.year!==r.year)return;
 const value=c.type==='league'?Number(!!r.teamResult?.leagueChampion):c.type==='japan'?Number(!!r.teamResult?.japanChampion):c.type==='title'?(r.awards||[]).length:c.type==='years'?Number(r.year>=c.eligibleYear):c.stat==='savesHolds'?(r.stats.saves||0)+(r.stats.holds||0):r.stats[c.stat]||0;
 c.value=value;
 if(c.type==='years'&&!value){s.news.push('ポスティング許可まであと'+(c.eligibleYear-r.year)+'シーズン。');s.postingReport={...c,resultYear:r.year};return;}
 c.status=value>=c.target?'achieved':'failed';
 s.postingReport={...c,resultYear:r.year};
 const text=c.status==='achieved'?'ポスティング課題達成。球団が次の申請の承認を約束。':'ポスティング課題未達。今季の条件付き承認は見送り。';
 s.timeline.push({year:r.year,text:text+'（'+c.label+'）'});s.news.push(text);
}

export function freeAgencyClock(s){const completed=s.records.filter(r=>r.stage==='pro').length,rights=faService(s);return {completed,fa:Math.ceil(rights.domesticDays/145),overseasFa:Math.ceil(rights.overseasDays/145),rights,posting:Math.max(0,MARKET_RULES.postingYears-completed),contractLeft:Math.max(0,(s.activeContract?.endYear??s.year)-s.year),domestic:s.stage==='pro'};}
export function faBenefits(s,index,production){const kind=index%4;const regular=production>=1.5&&(kind===1||kind===3);const careerRole=kind===2?'coach':kind===3&&s.proYears>=7?'coach':null;return {regular,pitchRole:regular&&s.player.role==='pitcher'?(['bench','cleanup'].includes(s.player.pitchRole)?'reliever':s.player.pitchRole):null,careerRole,label:kind===0?'年俸重視':kind===1?'出場機会重視':kind===2?'引退後の指導者契約':'長期の球団構想'};}

export function selectPostingAlternative(s,kind){
 if(!s.postingReport||s.postingReport.status==='achieved'||!['stats','years','stay'].includes(kind))throw Error('選択できないポスティングの代案です。');
 if(kind!=='stay'){
  if(s.stage!=='pro'||teamName(s.postingReport.team)!==teamName(s.team))throw Error('現在の所属球団ではこの条件を選べません。');
  const pitch=s.player.role==='pitcher',relief=pitch&&s.player.pitchRole!=='starter';
  const c={year:s.year,team:s.team,type:kind,status:'pending',target:1};
  if(kind==='years')Object.assign(c,{eligibleYear:s.year,label:s.year+'年のシーズン終了まで在籍すれば許可'});
  else Object.assign(c,{stat:pitch?(relief?'savesHolds':'so'):'hr',target:pitch?(relief?30:150):25,label:s.year+'年の一軍で'+(pitch?(relief?'セーブ＋ホールド30以上':'奪三振150以上'):'本塁打25本以上')});
  s.postingChallenge=c;s.timeline.push({year:s.year,text:'球団とポスティングの代案に合意：'+c.label});
 }
 s.postingReport=null;
}
