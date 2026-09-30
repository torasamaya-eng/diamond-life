import test from 'node:test';import assert from 'node:assert/strict';
import {narrativeFixtures,narrativePlayer,addYears} from './polish-fixtures.mjs';
import {classifyCareerNarrative,renderCareerNarrative} from '../dist/src/career-narrative.js';
import {careerReview,createCareerArchiveSnapshot,expandCareerState} from '../dist/src/archive.js';
for(const {id,state} of narrativeFixtures())test('実績から寸評を分類: '+id,()=>{
 const before=JSON.stringify(state),n=classifyCareerNarrative(state),text=careerReview(state);
 assert.equal(n.primary,id);assert.ok(n.evidence);assert.ok(text.length>15&&text.length<160);assert.ok(text.split('。').filter(Boolean).length<=2);
 assert.equal(text,renderCareerNarrative(state));assert.equal(text,careerReview(structuredClone(state)));assert.equal(JSON.stringify(state),before,'RNG and facts remain unchanged');
});
const contradictions=[
 ['表彰なしでタイトル多数としない',s=>addYears(s,6,{quality:'star'}),/数々のタイトル|タイトル多数/],
 ['メジャー出場ゼロを成功としない',s=>addYears(s,3,{stage:'mlb',quality:'none'}),/メジャーでも.*活躍|メジャーで居場所|メジャーの厳しい競争に定着/],
 ['未経験の独立ルートを捏造しない',s=>addYears(s,3),/独立リーグ/],
 ['育成指名なしで育成出身としない',s=>addYears(s,3),/育成指名/],
 ['軽傷を大けが復活としない',s=>{addYears(s,4);s.injuries=[{year:2027,totalDays:20,severe:false}];},/大けがを乗り越え/],
 ['国内復帰なしで復活としない',s=>addYears(s,4,{stage:'mlb'}),/帰国後|返り咲/],
 ['スター実績なしで球界の顔としない',s=>{s.player.arc='legend';addYears(s,6,{quality:'weak'});},/球界史|時代を代表|球界の顔|スター/]
];
for(const [name,setup,forbidden] of contradictions)test('矛盾防止: '+name,()=>{const s=narrativePlayer();setup(s);assert.doesNotMatch(careerReview(s),forbidden);});
test('独立から頂点に登った物語はlegendを副テーマにする',()=>{
 const s=narrativeFixtures().find(f=>f.id==='legend').state;s.teams.unshift({year:2020,stage:'independent',team:'独立球団'});
 const n=classifyCareerNarrative(s);assert.equal(n.primary,'independentClimber');assert.equal(n.secondary,'legend');
});
test('旧保存の寸評は再生成し、年度別事実・Seed・保存精度を変えない',()=>{
 const s=narrativeFixtures().find(f=>f.id==='overseasComeback').state;s.careerReview='古い数字列挙';s.records[0].paidSalary=7842.3417;
 const before=JSON.stringify(s),archive=expandCareerState(JSON.parse(JSON.stringify(createCareerArchiveSnapshot(s))));
 assert.equal(careerReview(archive),careerReview(s));assert.notEqual(careerReview(archive),s.careerReview);assert.deepEqual(archive.records,s.records);assert.equal(archive.seed,s.seed);assert.equal(JSON.stringify(s),before);
});
test('表彰と高いarcだけでは一軍実績ゼロのレジェンドを作らない',()=>{
 const s=narrativePlayer();addYears(s,20,{quality:'none'});s.player.arc='legend';s.honors=[{title:'永久欠番'}];s.awards=s.records.map(r=>({year:r.year,title:'MVP'}));
 assert.equal(classifyCareerNarrative(s).evidence.starYears,0);assert.doesNotMatch(careerReview(s),/球界史|時代を代表|球界の顔/);
});
test('国内で主力未経験の選手に返り咲き・復活を捏造しない',()=>{
 const s=narrativePlayer();addYears(s,2,{quality:'weak'});addYears(s,1,{stage:'mlb',quality:'weak'});addYears(s,2);
 assert.doesNotMatch(careerReview(s),/返り咲|再び国内の主力/);
});
test('辞退した高校育成指名を実際の育成入団と取り違えない',()=>{
 const s=narrativePlayer();addYears(s,4,{stage:'university',age:18});addYears(s,4,{age:22});
 s.drafts=[{year:2025,team:s.team,type:'育成',rank:1},{year:2029,team:s.team,type:'支配下',rank:1}];s.domesticEntry={route:'university',draftYear:2029};
 assert.ok(!classifyCareerNarrative(s).candidates.includes('developmentClimber'));assert.doesNotMatch(careerReview(s),/育成指名/);
});
test('旧保存も入団球団と前年ドラフトの一致から下位指名を判定する',()=>{
 const s=narrativeFixtures().find(f=>f.id==='lowerDraft').state;delete s.domesticEntry;
 assert.equal(classifyCareerNarrative(s).primary,'lowerDraft');s.drafts[0].team='別の球団';assert.ok(!classifyCareerNarrative(s).candidates.includes('lowerDraft'));
});
