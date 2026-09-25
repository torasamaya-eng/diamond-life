import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';
import {faService,recordFAService,entryDomesticYears} from '../dist/src/free-agency.js';
import {eligibility,negotiate,acceptOffer,remain,MLB_TEAMS} from '../dist/src/market.js';
import {queueMarketNotices} from '../dist/src/lifecycle.js';
import {emptyStats} from '../dist/src/stats.js';
import {TEAMS} from '../dist/src/data.js';
function player(years=8,route='high'){
 const s=createPlayer('FA検証','batter',91);Object.assign(s,{stage:'pro',team:TEAMS[0],year:2040,age:30,proYears:years,domesticEntry:{route,draftYear:2020}});
 s.records=Array.from({length:years},(_,i)=>({year:2030+i,stage:'pro',team:s.team,firstTeamDays:145,stats:{...emptyStats(),games:143,ab:550,hits:180,hr:35},overall:90,contractStatus:'registered'}));
 for(const k in s.player.abilities)s.player.abilities[k]=90;return s;
}
test('国内FAは高卒8・国内大学社会人7、海外FAは9、古いドラフトと海外大学・独立は原則8',()=>{
 for(const route of ['high','university','corporate','overseas','independent']){
 const s=player(7,route),expected=['university','corporate'].includes(route)?7:8;
 assert.equal(entryDomesticYears(s),expected);assert.equal(faService(s).domesticDays,(expected-7)*145);assert.equal(faService(s).overseasDays,290);
 s.domesticEntry.draftYear=2006;assert.equal(entryDomesticYears(s),8);
 }assert.equal(faService(player(9)).overseasDays,0);
});
test('年上限145日・短い年度の繰越・二軍育成海外の除外',()=>{
 const s=player(0);s.records=[{year:1,stage:'pro',firstTeamDays:180},{year:2,stage:'pro',firstTeamDays:100},{year:3,stage:'pro',firstTeamDays:45},{year:4,stage:'pro',contractStatus:'development',firstTeamDays:145},{year:5,stage:'mlb',firstTeamDays:145},{year:6,stage:'pro',stats:emptyStats(),levels:{first:emptyStats(),second:{games:120}}}];
 assert.equal(faService(s).total,290);s.records=[{year:1,stage:'pro'}];assert.equal(faService(s).total,0);
});
test('先発の登板数を登録日数と混同せず、故障特例は前年実登録145日以上・最大60日',()=>{
 const s=player(0);s.player.role='pitcher';s.player.pitchRole='starter';let r={year:2030,stage:'pro',pitchRole:'starter',contractStatus:'registered',stats:{games:28},levels:{first:{games:28},second:{games:0}}};
 recordFAService(s,r);assert.equal(r.faDays,145);s.records.push(r);
 let injured={...r,year:2031};delete injured.faDays;recordFAService(s,injured,{lost:.7});assert.equal(injured.faInjuryDays,60);assert.ok(injured.faDays<=145);
 s.records.push(injured);let next={...r,year:2032};recordFAService(s,next,{lost:.8});assert.equal(next.faInjuryDays,0);
 let farm={...r,year:2031,contractStatus:'development'};recordFAService(s,farm,{lost:1});assert.equal(farm.faDays,0);
});
test('海外FAは承認・能力条件不要、国内外からの提示で海外契約へ移籍',()=>{
 const s=player(9);s.postingChallenge={team:s.team,status:'pending',label:'優勝'};assert.equal(eligibility(s,'overseasFa'),'');
 const b=negotiate(s,'overseasFa',true);assert.equal(b.permissionGranted,true);assert.ok(b.offers.some(o=>o.stage==='mlb'));assert.ok(b.offers.some(o=>o.stage==='pro'));assert.ok(b.offers.every(o=>o.years>=2));
 const offer=b.offers.find(o=>o.stage==='mlb');acceptOffer(s,offer.id);assert.equal(s.stage,'mlb');assert.ok(MLB_TEAMS.includes(s.team));assert.equal(s.moves.at(-1).kind,'overseasFa');
});
test('国内FA移籍・宣言残留とも4シーズンで海外FA再取得、トレードは日数維持',()=>{
 for(const stay of [true,false]){
 const s=player(8);const board=negotiate(s,'fa',true),seed=s.seed;negotiate(s,'fa',true);assert.equal(s.seed,seed);assert.equal(s.faDeclarations.length,1);
 if(stay)remain(s);else acceptOffer(s,board.offers[0].id);
 assert.equal(faService(s).overseasDays,580);
 for(let i=0;i<4;i++)s.records.push({year:2040+i,stage:'pro',firstTeamDays:145});
 s.year=2044;s.activeContract=null;assert.equal(faService(s).overseasDays,0);assert.equal(eligibility(s,'overseasFa'),'');
 }
 const t=player(8);negotiate(t,'trade',true);acceptOffer(t,t.market.offers[0].id);assert.equal(faService(t).domesticDays,0);
});
test('新しい権利取得を通知し、複数年契約中の行使を制限、50歳も残年数内で契約可能',()=>{
 const s=player(9);queueMarketNotices(s);assert.ok(s.notices.some(n=>n.kind==='overseasFa'));
 s.activeContract={endYear:s.year+1};assert.match(eligibility(s,'overseasFa'),/複数年/);s.activeContract=null;s.age=50;
 const b=negotiate(s,'overseasFa',true);assert.ok(b.offers.every(o=>o.years===1));
});
