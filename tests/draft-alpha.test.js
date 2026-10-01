import test from 'node:test';
import assert from 'node:assert/strict';
import {CONFIG,validateConfig} from '../dist/draft/config.js';
import {generateCandidates,report,scouts} from '../dist/draft/candidates.js';
import {createSession,cpuBoards,finishDraft,chooseFirst,startDraft,playerPicks,available,eligible} from '../dist/draft/draft.js';
import {revealCareers,simulateCareer} from '../dist/draft/career.js';
import {sum,rates,KEYS} from '../dist/draft/stats.js';
import {saveSession,loadSession,deleteSession,STORAGE_KEY} from '../dist/draft/storage.js';
import {requestDraftCareerAd} from '../dist/draft/ads.js';
import fs from 'node:fs';
import {average} from '../dist/draft/candidates.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),m};};
function validStat(s,role){for(const k of KEYS)assert.ok(Number.isInteger(s[k])&&s[k]>=0,k);if(role==='野手'){assert.ok(s.hits<=s.ab-s.so);assert.ok(s.hr+s.doubles+s.triples<=s.hits);const r=rates(s);assert.ok(r.avg>=0&&r.avg<=1);assert.equal(r.ops,r.obp+r.slg);}else{assert.ok(s.er<=s.runs);assert.ok(s.hra<=s.ha);assert.ok(s.so<=s.outs);assert.ok(s.wins+s.losses<=s.games);}}
test('draft: seeded pool / complete draft / careers are deterministic',()=>{const a=finishDraft(createSession(52)),b=finishDraft(createSession(52));assert.deepEqual(a,b);assert.deepEqual(revealCareers(a),revealCareers(b));assert.deepEqual(revealCareers(a),revealCareers(a));});
test('draft: CPU has no access to latent future values',()=>{const a=generateCandidates(79),before=cpuBoards(a,79);for(const c of a)c.hidden={potential:0,injury:1,current:{},curve:'changed'};assert.deepEqual(cpuBoards(a,79),before);assert.ok(!JSON.stringify(a.map(report)).includes('potential'));assert.ok(!JSON.stringify(a.map(report)).includes('hidden'));});
test('draft: public first-pick declarations are honored and collisions reballot',()=>{const s=createSession(22);startDraft(s);s.declarations[1]=s.candidates[0].id;s.declarations[2]=s.candidates[0].id;chooseFirst(s,s.candidates[0].id);assert.ok(s.lotteries[0].find(x=>x.id===s.candidates[0].id).teams.includes(1));assert.ok(s.lotteries[0].find(x=>x.id===s.candidates[0].id).teams.includes(2));finishDraft(s);assert.equal(new Set(s.picks.map(p=>p.id)).size,60);});
test('draft: every round fills, restricted players and undrafted candidates remain coherent',()=>{for(let seed=0;seed<80;seed++){const s=finishDraft(createSession(seed));assert.equal(playerPicks(s).length,5);assert.equal(s.picks.length,60);assert.equal(available(s).length,16);for(const p of s.picks)assert.ok(eligible(s.candidates.find(c=>c.id===p.id),p.round,p.development));}});
test('draft: configuration rejects an insufficient candidate pool',()=>{assert.throws(()=>validateConfig({...CONFIG,candidatePoolSize:60}));assert.equal(finishDraft(createSession(9,{...CONFIG,candidatePoolSize:80})).picks.length,60);});
test('draft: all generated numeric data is finite before JSON encoding',()=>{function visit(x){if(typeof x==='number')assert.ok(Number.isFinite(x));else if(x&&typeof x==='object')Object.values(x).forEach(visit);}for(let i=0;i<8;i++)visit(createSession(i));});
test('draft: all amateur years and split counts reconcile',()=>{for(const c of generateCandidates(142)){assert.equal(c.history[0].age,16);assert.equal(c.history.at(-1).age,c.age);for(const y of c.history){validStat(y.stats,c.role);assert.deepEqual(sum(Object.values(y.splits)),y.stats);if(y.national)validStat(y.national.stats,c.role);}assert.equal(scouts(report(c)).length,3);}});
test('draft: complete annual / farm records sum to retired totals and salaries',()=>{const s=finishDraft(createSession(542));for(const r of revealCareers(s)){assert.deepEqual(r.total,sum(r.rows.map(y=>y.stats)));assert.deepEqual(r.farmTotal,sum(r.rows.map(y=>y.farm)));assert.equal(r.totalSalary,r.rows.reduce((s,y)=>s+y.salary,0));assert.equal(r.retirementAge,r.rows.at(-1).age);for(const y of r.rows){validStat(y.stats,r.role);validStat(y.farm,r.role);if(y.injuryDays>=210)assert.equal(y.stats.games+y.farm.games,0);}}});
test('draft: prior medical risk changes future injuries without guaranteeing failure',()=>{let low=0,high=0;for(let i=0;i<60;i++){const c=generateCandidates(i)[0],a=structuredClone(c),b=structuredClone(c);a.hidden.injury=0;b.hidden.injury=1;const pick={team:0,round:1,development:false};low+=simulateCareer(a,pick,i).injuries.length;high+=simulateCareer(b,pick,i).injuries.length;}assert.ok(high>low*1.2,`${low}/${high}`);});
test('draft: storage is independent, versioned and handles quota/corruption',()=>{const m=memory();m.setItem('diamond-life.autosave','protected');const s=createSession(9);assert.equal(saveSession(s,m),'');assert.deepEqual(loadSession(m).state,s);deleteSession(m);assert.equal(m.getItem('diamond-life.autosave'),'protected');m.setItem(STORAGE_KEY,'broken');assert.equal(loadSession(m).state,null);assert.ok(saveSession(s,{setItem(){throw Error('QuotaExceededError');}}));});
test('draft: disabled ad once only and no game destruction',async()=>{const s=finishDraft(createSession(9)),before=JSON.stringify(s.picks);assert.equal(await requestDraftCareerAd(s),'disabled');assert.equal(await requestDraftCareerAd(s),'disabled');assert.equal(s.adAttempted,true);assert.equal(JSON.stringify(s.picks),before);assert.equal(await requestDraftCareerAd(createSession(2)),'ineligible');});
for(const mode of ['not-ready','no-ad','error','timeout','shown'])test(`draft: ad ${mode} always completes`,async()=>{const s=finishDraft(createSession(1));let calls=0;const adapter={ready:()=>mode!=='not-ready',request(h){calls++;if(mode==='error')throw Error();if(mode==='no-ad')h.adBreakDone({breakStatus:'no-ad'});if(mode==='shown'){h.beforeAd();h.afterAd();}}};const opts={adapter,config:{enabled:true,timeoutMs:5,displayTimeoutMs:10}};const [a,b]=await Promise.all([requestDraftCareerAd(s,opts),requestDraftCareerAd(s,opts)]);assert.equal(a,mode);assert.equal(a,b);assert.ok(calls<=1);assert.equal(revealCareers(s).length,5);});
// These are examples found in the seeded population, not forced production classes.
const fixtures=JSON.parse(fs.readFileSync(new URL('./draft-fixtures.json',import.meta.url)));
const predicates={
 A:c=>c.category==='大学'&&c.role==='投手'&&c.history.every((y,i,a)=>!i||y.velocity>=a[i-1].velocity),
 B:c=>c.category==='大学'&&c.history[2].velocity>148&&c.history.at(-1).velocity<c.history[2].velocity-2,
 C:c=>c.category==='大学'&&c.history.slice(3,6).some(y=>y.slump)&&!c.history.at(-1).slump,
 D:c=>c.category==='社会人'&&c.hidden.curve==='corporate'&&c.trend>1,
 E:c=>c.category==='独立'&&c.hidden.curve==='independent'&&c.trend>1,
 F:(c,r)=>c.family&&c.rank<=28&&r.value<8,
 G:(c,r)=>c.family&&r.value>=55,
 H:c=>c.role==='投手'&&c.medical.length&&average(c.hidden.current)>65,
 I:c=>c.rank>40&&c.trend>1&&c.history.every((y,i,a)=>!i||y[c.role==='投手'?'velocity':'exitVelocity']>=a[i-1][c.role==='投手'?'velocity':'exitVelocity']),
 J:c=>c.category==='高校'&&c.height>=187&&c.weight<=80&&c.hidden.potential-average(c.hidden.current)>15,
 K:c=>c.category==='高校'&&average(c.hidden.current)>60&&c.hidden.potential-average(c.hidden.current)<8,
 L:c=>c.position==='捕手'&&c.hidden.current.power>70&&c.hidden.current.field<58,
 M:c=>c.role==='投手'&&c.hidden.current.stuff>65&&c.hidden.current.stamina<55,
 N:c=>rates(c.history.at(-1).stats).era<2.5&&rates(c.history.at(-1).national.stats).era>5,
 O:c=>c.representative,
 P:(c,r)=>r.pick.development&&r.value>=55
};
// Original fixtures remain unchanged and verify the old-save model exactly.
const legacyConfig={...CONFIG,scoutingModel:'legacy',careerModel:'legacy'};
for(const [key,predicate] of Object.entries(predicates))test(`draft: legacy representative prospect ${key} arises naturally`,()=>{const fixture=fixtures[key];assert.ok(fixture);const s=finishDraft(createSession(fixture.seed,legacyConfig)),c=s.candidates.find(c=>c.id===fixture.id),pick=s.picks.find(p=>p.id===c.id),r=simulateCareer(c,pick,fixture.seed);assert.ok(predicate(c,r));assert.equal(r.value,fixture.value);});
test('draft: development contracts have no top-team games until promotion; events agree with annual roles',()=>{for(let seed=1;seed<15;seed++){const s=finishDraft(createSession(seed));for(const r of revealCareers(s)){for(const y of r.rows){if(y.contract==='育成')assert.equal(y.stats.games,0);if(y.injuryDays>=210)assert.equal(y.stats.games+y.farm.games,0);}for(const e of r.events.filter(e=>e.type==='ROLE'))assert.ok(r.rows.some(y=>y.year===e.year&&y.age===e.age));}}});
test('draft: a batter without a left-hand weakness cannot get a repair event from irrelevant set velocity',()=>{for(const c of generateCandidates(31).filter(c=>c.role==='野手'&&c.hidden.leftSplit>=-3)){const r=simulateCareer(c,{team:0,round:5,development:true},31);assert.ok(!r.events.some(e=>e.type==='REPAIR'));}});
