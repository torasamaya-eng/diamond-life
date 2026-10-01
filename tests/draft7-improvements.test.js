import test from 'node:test';import assert from 'node:assert/strict';
import {rankAwards,leagueOpponents,leagueOf} from '../dist/draft/honors.js';
import {empty,sum,rates} from '../dist/draft/stats.js';
import {createSession,finishDraft,startDraft,firstCompetition,chooseFirst} from '../dist/draft/draft.js';
import {careerCompetition,revealCareers,simulateCareer} from '../dist/draft/career.js';
import {formatMoney} from '../dist/draft/format.js';
import {evaluateCareer} from '../dist/draft/evaluation.js';
import {developmentReview} from '../dist/draft/scouting.js';
const batter=(id,stats)=>({id,role:'野手',position:'一塁',stats:{...empty(),games:130,ab:500,hits:150,...stats}});
const pitcher=(id,stats)=>({id,role:'投手',position:'先発',usage:'先発',stats:{...empty(),games:26,outs:450,er:50,...stats}});
test('draft7 honors: league leaders, tied winners and minimum playing volume',()=>{
 const field=[batter('short',{ab:100,hits:60,hr:40}),batter('a',{hits:170,hr:35}),batter('b',{hits:170,hr:36})],w=rankAwards(field);
 assert.ok(!w.get('short').includes('首位打者'));assert.ok(w.get('short').includes('本塁打王'));
 assert.ok(w.get('a').includes('首位打者'));assert.ok(w.get('b').includes('首位打者'));assert.ok(!w.get('b').includes('本塁打王'));
 const p=rankAwards([pitcher('short',{outs:6,er:0}),pitcher('leader',{outs:500,er:30}),pitcher('second',{outs:500,er:31})]);
 assert.ok(!p.get('short').includes('最優秀防御率'));assert.ok(p.get('leader').includes('最優秀防御率'));assert.ok(!p.get('second').includes('最優秀防御率'));
});
test('draft7 honors: position awards have limited seats, DH never wins a fielding award',()=>{
 const field=Array.from({length:5},(_,i)=>({...batter('b'+i,{hr:10+i}),position:i===0?'指名打者':'中堅',defense:{games:130,chances:300,contribution:i}})),w=rankAwards(field);
 assert.ok(!w.get('b0').includes('ゴールデングラブ賞'));assert.equal([...w.values()].filter(x=>x.includes('MVP')).length,1);
 assert.equal(field.filter(e=>e.position==='中堅'&&w.get(e.id).includes('ベストナイン')).length,3);
});
test('draft7 honors: opponents and full cohort leaders are deterministic and independent of reveal order',()=>{
 assert.deepEqual(leagueOpponents(7,2030,'セントリーグ'),leagueOpponents(7,2030,'セントリーグ'));
 const s=finishDraft(createSession(7)),pool=careerCompetition(s),groups=new Map();
 for(const r of pool)for(const row of r.rows){const key=row.year+':'+leagueOf(row);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({id:r.id,role:r.role,position:row.position,usage:row.role,stats:row.stats,defense:row.defense,row});}
 for(const [key,actual] of groups){const year=actual[0].row.year,league=leagueOf(actual[0].row),w=rankAwards([...leagueOpponents(s.seed,year,league),...actual]);for(const e of actual)assert.deepEqual(e.row.awards,w.get(e.id),key);}
 assert.deepEqual(revealCareers(s),revealCareers(finishDraft(createSession(7))));
});
test('draft7 lottery: preview consumes no seed or picks and gives the exact competing teams',()=>{
 const s=createSession(7),id=s.candidates[0].id;startDraft(s);s.declarations.fill(id);const before=structuredClone(s);
 assert.equal(firstCompetition(s,id).length,12);assert.deepEqual(s,before);chooseFirst(s,id);chooseFirst(before,id);assert.deepEqual(s,before);
});
test('draft7 honors: award comparison never changes season statistics, money, injury or retirement',()=>{
 const s=finishDraft(createSession(52)),p=s.picks[0],c=s.candidates.find(c=>c.id===p.id),raw=simulateCareer(c,p,s.seed,null,{honors:false}),honored=simulateCareer(c,p,s.seed);
 const core=r=>({total:r.total,farmTotal:r.farmTotal,rows:r.rows.map(({awards,honorDetails,...y})=>y),totalSalary:r.totalSalary,highestSalary:r.highestSalary,injuries:r.injuries,retirementAge:r.retirementAge,value:r.value});
 assert.deepEqual(core(raw),core(honored));
});
test('draft7 money: 万 / 億 boundaries, no double units or internal conversion',()=>{
 for(const [amount,text] of [[0,'0万円'],[240,'240万円'],[9999,'9,999万円'],[10000,'1億円'],[12500,'1億2,500万円'],[203456,'20億3,456万円']])assert.equal(formatMoney(amount),text);
 assert.equal(formatMoney(NaN),'—');assert.equal(formatMoney(-1),'—');
});
function career(role,stats,n=4){const rows=Array.from({length:n},(_,i)=>({year:2027+i,age:23+i,role:role==='投手'?'先発':'レギュラー',position:role==='投手'?'投手':'一塁',stats:{...empty(),...stats},farm:empty(),contract:'支配下',team:'大阪ブレイバーズ'}));return {role,pick:{round:1,team:0},rows,total:sum(rows.map(r=>r.stats)),events:[],titles:[],injuries:[]};}
test('draft7 assessment: years played alone do not create a star or a successful first-round pick',()=>{
 const r=career('野手',{games:130,ab:500,hits:105,hr:4,bb:20},10),e=evaluateCareer(r);
 assert.equal(e.facts.regular,0);assert.match(e.narrative,/出場量に対して打撃の貢献は乏しく/);assert.ok(!e.narrative.includes('一軍の定位置を長く守り'));
 const accumulated=evaluateCareer(career('野手',{games:130,ab:500,hits:105,hr:4,bb:20},25));assert.ok(!['スター','スーパースター','レジェンド'].includes(accumulated.absolute));
 const one=career('投手',{games:26,outs:450,er:45,wins:10},1),v=evaluateCareer(one);assert.equal(v.expectation,'期待を下回った');assert.match(v.narrative,/好成績は一時的/);
});
test('draft7 assessment: poor run prevention and zero top-level work are explicitly described',()=>{
 const bad=career('投手',{games:25,outs:360,er:90,wins:6}),e=evaluateCareer(bad);assert.equal(e.facts.rotation,0);assert.match(e.narrative,/失点を抑える内容には課題/);
 const zero=career('野手',{});zero.pick.development=true;assert.match(evaluateCareer(zero).narrative,/一軍で打数を記録できなかった/);assert.equal(evaluateCareer(zero).expectation,'期待に届かなかった');
});
test('draft7 comparison: public amateur clues and recorded pro outcomes, no hidden talent displayed',()=>{
 const s=finishDraft(createSession(42));for(const r of revealCareers(s)){const c=s.candidates.find(c=>c.id===r.id),d=developmentReview(r,c);assert.ok(d.rows.length>=3);assert.ok(!/potential|hidden|talent/.test(JSON.stringify(d)));assert.ok(d.rows.flat().some(x=>String(x).includes(r.rows.at(-1).role)));assert.ok(r.rows.some(y=>y.year===r.careerHigh));}
});
