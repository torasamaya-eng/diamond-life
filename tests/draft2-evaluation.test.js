import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateCareer} from '../dist/draft/evaluation.js';import {empty,sum} from '../dist/draft/stats.js';
import {NEEDS,recruitmentReview,teamProfile,fitNeeds} from '../dist/draft/teams.js';import {TEAMS,CONFIG} from '../dist/draft/config.js';
import {createSession,selectTeam,acceptTeamContext,finishDraft,cpuBoards,startDraft,pick,available,eligible} from '../dist/draft/draft.js';
import {generateCandidates,report} from '../dist/draft/candidates.js';import {revealCareers,simulateCareer} from '../dist/draft/career.js';
import {fielding} from '../dist/draft/tools.js';import {random} from '../dist/draft/random.js';
import {saveSession,loadSession,STORAGE_KEY} from '../dist/draft/storage.js';import {hash} from '../dist/draft/random.js';
function sample(o={}){const pitch=o.pitch!==false,n=o.n??5;const rows=Array.from({length:n},(_,i)=>{const st=empty();Object.assign(st,pitch?{games:26,outs:450,er:65,ha:130,bba:40,so:120,wins:8,losses:7}:{games:115,ab:420,hits:120,doubles:20,hr:12,so:70,bb:35,sb:4},o.stats);return {year:2027+i,age:23+i,team:TEAMS[0],role:o.role??(pitch?'先発':'レギュラー'),position:o.position??(pitch?'先発':'遊撃'),contract:o.contract??'支配下',level:o.level??'国内',stats:st,farm:empty(),defense:pitch?null:{contribution:o.defense??1,tools:{range:o.glove??55,catching:o.glove??55}},injuryDays:0};});return {role:pitch?'投手':'野手',pick:{team:0,round:o.round??1,development:!!o.dev},rows,total:sum(rows.map(y=>y.stats)),injuries:[],events:[],titles:[]};}
const cases=[
 ['ドラ1複数二桁', {n:10,stats:{wins:11}}, '長期ローテーション投手','期待に応えた'],
 ['ドラ1一度二桁',{n:1,stats:{wins:10}},'短期活躍','期待を下回った'],
 ['勝ち運なし優秀なIPとERA',{n:6,stats:{wins:4,er:40}},'エース','期待以上'],
 ['投手二軍のみ',{stats:{games:0,outs:0,wins:0}},'一軍定着できず','期待に届かなかった'],
 ['4位長期ローテ',{n:10,round:4},'長期ローテーション投手','期待以上'],
 ['育成支配下だけ',{dev:true,stats:{games:0,outs:0,wins:0}},'支配下昇格','期待に届かなかった'],
 ['育成先発主力',{dev:true,n:5},'ローテーション投手','期待を大きく上回った'],
 ['長期セットアップ',{role:'セットアッパー',n:6,stats:{games:55,outs:180,wins:3,holds:25}},'セットアッパー','期待に応えた'],
 ['抑え成功',{role:'抑え',n:4,stats:{games:55,outs:165,er:10,wins:2,saves:28}},'守護神','期待に応えた'],
 ['長期救援',{role:'中継ぎ',n:7,stats:{games:42,outs:110,er:8,wins:2}},'救援の仕事人','期待に応えた'],
 ['投手レジェンド',{n:20,stats:{wins:15}},'レジェンド','期待を大きく上回った'],
 ['投手スーパースター',{n:16,stats:{wins:12}},'スーパースター','期待を大きく上回った'],
 ['投手スター',{n:12,stats:{wins:11}},'スター','期待以上'],
 ['先発昇降格',{n:4,stats:{games:9,outs:100,wins:1}},'一軍と二軍を往復','期待を下回った'],
 ['ドラ1長期野手',{pitch:false,n:10},'長期主力','期待に応えた'],
 ['ドラ1短期野手',{pitch:false,n:1,stats:{hits:145,hr:25}},'短期活躍','期待を下回った'],
 ['下位スター',{pitch:false,n:14,round:4},'スター','期待を大きく上回った'],
 ['育成レギュラー',{pitch:false,n:4,dev:true},'レギュラー','期待を大きく上回った'],
 ['守備遊撃',{pitch:false,n:6,role:'守備固め',glove:80,defense:5,stats:{games:75,ab:110,hits:25}},'守備職人','期待に応えた'],
 ['守備固め',{pitch:false,n:5,role:'守備固め',glove:77,defense:4,stats:{games:70,ab:100,hits:23}},'守備職人','期待に応えた'],
 ['代走',{pitch:false,n:5,role:'代走',stats:{games:65,ab:25,hits:6,sb:18}},'代走要員','一定の成果を残した'],
 ['ユーティリティ',{pitch:false,n:6,role:'ユーティリティ',stats:{games:65,ab:120,hits:28}},'ユーティリティ','一定の成果を残した'],
 ['守備捕手',{pitch:false,n:6,role:'守備固め',position:'捕手',glove:82,defense:6,stats:{games:80,ab:140,hits:30}},'守備職人','期待に応えた'],
 ['主砲',{pitch:false,n:6,position:'一塁',stats:{hr:30}},'主砲','期待以上'],
 ['DH専任',{pitch:false,n:5,position:'指名打者',stats:{hr:20}},'レギュラー','期待に応えた'],
 ['代打',{pitch:false,n:4,role:'代打',stats:{games:65,ab:85,hits:20}},'代打','一定の成果を残した'],
 ['守備低値は職人にしない',{pitch:false,n:6,role:'守備固め',glove:25,defense:-3,stats:{games:60,ab:90,hits:18}},'一軍戦力','期待を下回った'],
 ['野手育成のまま',{pitch:false,dev:true,contract:'育成',stats:{games:0,ab:0,hits:0}},'育成のまま終了','期待に届かなかった'],
 ['野手一軍二軍',{pitch:false,n:4,stats:{games:20,ab:30,hits:6}},'一軍と二軍を往復','期待を下回った'],
 ['一軍わずか',{pitch:false,n:2,stats:{games:6,ab:10,hits:2}},'一軍定着できず','期待に届かなかった'],
 ['一軍戦力下位',{pitch:false,round:4,n:5,stats:{games:65,ab:130,hits:28}},'一軍戦力','おおむね期待に応えた'],
 ['野手レジェンド',{pitch:false,n:20,stats:{hits:160,hr:28}},'レジェンド','期待を大きく上回った']
];
for(const [label,opts,absolute,expectation] of cases)test(`draft2 career: ${label}`,()=>{const r=sample(opts),e=evaluateCareer(r);assert.equal(e.absolute,absolute);assert.equal(e.expectation,expectation);assert.ok(e.narrative.length>25);assert.ok(!e.narrative.includes('海外成功'));assert.ok(!e.narrative.includes('大怪我'));if(!opts.dev)assert.ok(!e.narrative.includes('育成から'));});
test('draft2 teams: every selectable club is the player, other eleven finish their picks',()=>{for(let index=0;index<12;index++){const s=createSession(42,CONFIG,null);selectTeam(s,index);assert.equal(s.phase,'team-context');acceptTeamContext(s);finishDraft(s);assert.equal(s.picks.filter(p=>p.team===index).length,5);assert.equal(s.picks.length,60);assert.equal(new Set(s.clubs.map(c=>c.team)).size,12);assert.deepEqual(s.teamNeeds,teamProfile(42,index).needs);}});
test('draft2 need: independent deterministic generation and hidden-blind CPU',()=>{const a=createSession(42),b=createSession(42);assert.deepEqual(a.teamContext,b.teamContext);const before=cpuBoards(a.candidates,42);for(const c of a.candidates)c.hidden={potential:999,success:true};assert.deepEqual(cpuBoards(a.candidates,42),before);});
test('draft2 need: an entirely different draft remains legal and completes',()=>{const s=createSession(58);s.teamNeeds=[NEEDS.starter];startDraft(s);while(['first','rounds'].includes(s.phase)){const choices=available(s).filter(c=>eligible(c,s.round,s.round>4));pick(s,(choices.find(c=>c.role==='野手')||choices[0]).id);}assert.equal(s.picks.filter(p=>p.team===0).length,5);assert.equal(revealCareers(s).length,5);});
const pitcher={id:'a',name:'大学投手',role:'投手',age:22,projection:'先発を軸に評価',hand:'右投右打',pitches:[{strike:68,whiff:24}],velocity:150,medical:[],category:'大学'};
test('draft2 need A: ready starter joins the original rotation',()=>{const r=sample(),c=pitcher;r.id='a';const s={playerTeam:0,teamNeeds:[NEEDS.starter],picks:[{team:0,id:'a'}],candidates:[c]};assert.equal(recruitmentReview(s,[r]).items[0].status,'狙いに応えた');assert.match(evaluateCareer(r,c,[NEEDS.starter]).needReview,/狙い/);});
test('draft2 need B: high-school star does not retrospectively satisfy urgent pitching need',()=>{const c={id:'a',name:'高校野手',role:'野手',category:'高校',age:18},r=sample({pitch:false,n:14});r.id='a';r.name=c.name;r.evaluation=evaluateCareer(r,c,[NEEDS.starter]);const s={playerTeam:0,teamNeeds:[NEEDS.starter],picks:[{team:0,id:'a'}],candidates:[c]};const v=recruitmentReview(s,[r]);assert.equal(v.items[0].status,'当初課題は未達');assert.match(v.summary,/長期的/);assert.ok(!r.evaluation.needReview.includes('狙いに'));});
test('draft2 need C: defensive shortstop fulfills original position request',()=>{const c={id:'a',name:'守備遊撃',position:'遊撃',role:'野手',hand:'右投右打',defenseTools:{range:80,catching:80}},r=sample({pitch:false,defense:5,glove:80});r.id='a';const s={playerTeam:0,teamNeeds:[NEEDS.shortDefense],picks:[{team:0,id:'a'}],candidates:[c]};assert.equal(recruitmentReview(s,[r]).items[0].status,'狙いに応えた');});
test('draft2 need D: a catcher taken by a CPU does not count as the player acquisition',()=>{const s={playerTeam:0,teamNeeds:[NEEDS.catcherReady],picks:[{team:1,id:'a'}],candidates:[{id:'a',position:'捕手',age:22,role:'野手',hand:'右投右打'}]};assert.equal(recruitmentReview(s).items[0].status,'未達');});
test('draft2 need: post-draft changes cannot invent historical requirements',()=>{const s={playerTeam:0,teamNeeds:[NEEDS.starter],needsAtDraft:[NEEDS.catcherReady],picks:[],candidates:[]};assert.equal(recruitmentReview(s).items[0].id,'catcherReady');});
test('draft2 career: defense counts reconcile and good character never creates guaranteed outcomes',()=>{const s=finishDraft(createSession(101));for(const r of revealCareers(s)){for(const y of r.rows)if(y.defense){const d=y.defense;assert.equal(d.putouts+d.assists+d.errors,d.chances);assert.ok(d.caught<=d.attempts);}assert.ok(!/成功確実|失敗確実/.test(r.narrative));}});
test('draft2 migration: keep records, no retroactive needs, deterministic traits and isolated storage',()=>{let s=finishDraft(createSession(3));revealCareers(s);s.saveVersion=1;s.config.saveVersion=1;delete s.playerTeam;delete s.teamNeeds;delete s.teamContext;delete s.needsAtDraft;for(const c of s.candidates){delete c.hidden.personality;delete c.hidden.defense;delete c.personality;delete c.defenseTools;}const data=JSON.stringify({version:1,checksum:hash(JSON.stringify(s)),state:s});const storage=()=>{const m=new Map([[STORAGE_KEY,data],['diamond-life.autosave','keep']]);return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),m};};const a=storage(),b=storage(),x=loadSession(a).state,y=loadSession(b).state;assert.deepEqual(x,y);assert.ok(x.legacyNeeds);assert.equal(x.teamNeeds,null);assert.deepEqual(x.results.map(r=>r.rows),s.results.map(r=>r.rows));assert.equal(a.getItem('diamond-life.autosave'),'keep');assert.equal(JSON.parse(a.getItem(STORAGE_KEY)).version,2);assert.deepEqual(loadSession(a).state,x);});
test('draft2 names: official twelve teams only, life runtime is never imported',async()=>{const fs=await import('node:fs');assert.equal(TEAMS.length,12);assert.deepEqual(TEAMS,['大阪ブレイバーズ','横浜セイラーズ','東京クラウンズ','名古屋フェニックス','神宮ウイングス','広島レッドアローズ','福岡オーシャンズ','北海道ノーザンズ','千葉ウェーブス','神戸ハーバーズ','仙台フォレスターズ','埼玉キングス']);for(const f of fs.readdirSync('dist/draft').filter(f=>f.endsWith('.js')))assert.ok(!/from\s+['"]\.\.\/src\//.test(fs.readFileSync('dist/draft/'+f,'utf8')));const s=finishDraft(createSession(92));revealCareers(s);assert.ok(!/瀬戸内ブルームズ|北陸スノーフィンズ|信州リッジズ|常陸レイクス/.test(JSON.stringify(s)));for(const r of s.results)for(const y of r.rows)if(y.level==='国内')assert.ok(TEAMS.includes(y.team));});
test('draft2 legacy names migrate without inventing old fielding or club instructions',()=>{const s=finishDraft(createSession(4));revealCareers(s);for(const c of s.candidates){delete c.hidden.personality;delete c.hidden.defense;delete c.personality;delete c.defenseTools;for(const y of c.history)delete y.defense;}for(const r of s.results)for(const y of r.rows)delete y.defense;s.clubs[0].team='瀬戸内ブルームズ';s.news.push('瀬戸内ブルームズへ入団');delete s.playerTeam;const raw=JSON.stringify({version:1,state:s,checksum:hash(JSON.stringify(s))});let value=raw;const storage={getItem:()=>value,setItem:(k,v)=>value=v};const result=loadSession(storage);assert.equal(result.state.clubs[0].team,TEAMS[0]);assert.ok(!JSON.stringify(result.state).includes('瀬戸内ブルームズ'));assert.ok(result.state.candidates.every(c=>c.history.every(y=>y.defense===undefined)));assert.ok(result.state.results.every(r=>r.rows.every(y=>y.defense===undefined)));assert.equal(result.state.teamNeeds,null);});

test('draft2 DH: no phantom fielding contribution, defensive assignment or glove award',()=>{
 const c=generateCandidates(42).find(c=>c.role==='野手');c.position='指名打者';
 const d=fielding({range:90,catching:90,throwing:90,arm:90,blocking:90},c.position,143,random(42));
 for(const key of ['games','chances','errors','putouts','assists','doublePlays','attempts','caught','passedBalls','contribution'])assert.equal(d[key],0,key);
 const r=simulateCareer(c,{team:0,round:1,development:false},42);
 for(const y of r.rows){assert.equal(y.defense.games,0);assert.equal(y.defense.contribution,0);assert.notEqual(y.role,'守備固め');assert.ok(!y.awards.includes('ゴールデングラブ相当'));assert.equal(new Set(y.positions).size,y.positions.length);}
});
