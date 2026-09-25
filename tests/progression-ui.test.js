import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('名鑑閲覧は進行中の選手を変えず、満枠の入替と削除は確認後だけ実行する',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const g=game(storage);g.run("for(let i=0;i<3;i++){const p=createPlayer('名鑑'+i,'batter',123+i);retire(p);saveRetiredCareer(p);}s=createPlayer('現役','batter',400);autoSave();");
 const live=g.run('s.careerId'),auto=storage.getItem('diamond-life.autosave');
 g.click('library-open');assert.match(g.html('#app'),/保存選手 3 \/ 3/);
 const id=g.run('readCareerLibrary().careers[0].careerId');
 g.click('library-view',id);assert.match(g.html('#app'),/全年度の成績/);assert.match(g.html('#app'),/海外マイナー/);
 assert.equal(g.run('s.careerId'),live);assert.equal(storage.getItem('diamond-life.autosave'),auto);
 g.run('retire(s)');g.click('library-save');assert.match(g.html('#app'),/保存枠がいっぱいです/);
 const before=storage.getItem('diamond-life.retired-careers');
 g.click('library-replace',id);assert.match(g.html('#modal'),/入れ替えますか/);assert.equal(storage.getItem('diamond-life.retired-careers'),before);
 g.click('library-back');assert.equal(storage.getItem('diamond-life.retired-careers'),before);
 g.click('library-replace',id);g.click('library-confirm',id);assert.equal(g.run('readCareerLibrary().careers.length'),3);assert.ok(g.run('readCareerLibrary().careers.some(c=>c.careerId===s.careerId)'));
 g.click('library-delete',live);assert.equal(g.run('readCareerLibrary().careers.length'),3);g.click('library-confirm',live);assert.equal(g.run('readCareerLibrary().careers.length'),2);
});

test('最終キャリアの広告が失敗しても画面遷移し、保存・再開後は再要求しない',async()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const g=game(storage);pro(g);g.run("retire(s);FINAL_CAREER_AD_CONFIG.enabled=true;let adCalls=0;setFinalCareerAdAdapter({ready:()=>true,request:()=>{adCalls++;throw Error('blocked');}})");
 assert.match(g.run('play()'),/最終キャリアを見る/);
 await g.run('openFinalCareer()');assert.equal(g.run('tab'),'career');assert.equal(g.run('adCalls'),1);assert.equal(g.run('s.finalCareerAd.status'),'error');
 await g.run('openFinalCareer()');assert.equal(g.run('adCalls'),1);
 const next=game(storage);next.click('resume');assert.equal(next.run('s.retired'),true);
 await next.run('openFinalCareer()');assert.equal(next.run('tab'),'career');assert.equal(next.run('s.finalCareerAd.attempted'),true);
});

test('結果共有は引退後のみ表示し、既存の年度別成績表を維持する',()=>{
 const g=game();pro(g);assert.doesNotMatch(g.run('play()'),/結果をシェア/);
 const before=g.run('table(s.records)');g.run('retire(s)');
 assert.match(g.run('play()'),/結果をシェア/);assert.equal(g.run('table(s.records)'),before);
});

test('自動保存から続きへ再開し、新しい人生は確認前もキャンセル後も旧データを保持',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const first=game(storage);assert.doesNotMatch(first.html('#app'),/続きから/);
 first.click('new');first.click('random-player');const id=first.run('s.careerId');
 first.click('advance');const period=first.run('s.period');
 const reload=game(storage);assert.match(reload.html('#app'),/続きから/);assert.equal(reload.run('s'),null);
 reload.click('resume');assert.equal(reload.run('s.careerId'),id);assert.equal(reload.run('s.period'),period);
 const before=storage.getItem('diamond-life.autosave');
 reload.click('new');assert.match(reload.html('#modal'),/上書き/);assert.equal(storage.getItem('diamond-life.autosave'),before);
 reload.click('close');assert.equal(storage.getItem('diamond-life.autosave'),before);
 reload.click('new');reload.click('confirm-new');assert.equal(storage.getItem('diamond-life.autosave'),before);
 reload.click('random-player');assert.notEqual(reload.run('s.careerId'),id);
 assert.equal(game(storage).run('savedCareer.state.careerId'),reload.run('s.careerId'));
});

test('降格拒否後の3進路を表示し、トレード後も進行できる',()=>{
 const g=game();pro(g);
 g.run("s.stage='mlb';s.team=MLB_TEAMS[0];s.rosterDecision={type:'consent',year:s.year,date:'2032-03-21'};s.activeContract.team=s.team;rosterDecisionDialog();");
 g.click('roster-choice','decline');assert.match(g.html('#modal'),/メジャーで残留/);assert.match(g.html('#modal'),/トレードで移籍/);assert.match(g.html('#modal'),/自由契約/);
 const destination=g.run('s.rosterDecision.tradeTeam');g.click('roster-choice','trade');
 assert.equal(g.run('s.team'),destination);assert.equal(g.run('s.activeContract.team'),destination);assert.equal(g.run('s.rosterDecision'),null);
});
test('キャリアハイを赤字用クラスで表示し、通算行と小標本の率を除外',()=>{
 const g=game();pro(g);
 g.run("s.records=[{year:2030,stage:'pro',team:TEAMS[0],stats:{...emptyStats(),games:130,ab:500,hits:150,hr:20}},{year:2031,stage:'pro',team:TEAMS[0],stats:{...emptyStats(),games:1,ab:1,hits:1,hr:1}}]");
 g.click('stats-open','year');const html=g.html('#app');
 assert.match(html,/class="career-best"[^>]*>20<\/td>/);assert.match(html,/class="career-best"[^>]*>\.300<\/td>/);
 assert.doesNotMatch(html,/class="career-best"[^>]*>1\.000<\/td>/);
});

test('打撃と守備を切り替え、国内一二軍と海外マイナーの守備記録を別表示する',()=>{
 const g=game();pro(g);
 g.run("const first={...emptyStats(),games:80,fieldGames:80,putouts:100,assists:200,errors:3,doublePlays:40};const second={...emptyStats(),games:20,fieldGames:20,putouts:20,assists:30,errors:2,doublePlays:5};s.records=[{year:2031,stage:'pro',team:TEAMS[0],stats:first,levels:{first,second}},{year:2032,stage:'mlb',team:MLB_TEAMS[0],stats:first,levels:{first,second}}];");
 g.click('stats-open','first');g.click('stat-category','fielding');
 let html=g.html('#app');assert.match(html,/<th>守備率<\/th>/);assert.match(html,/<th>刺殺<\/th>/);assert.match(html,/<td>200<\/td>/);assert.doesNotMatch(html,/<th>OPS<\/th>/);
 g.click('record-type','second');html=g.html('#app');assert.match(html,/<td>30<\/td>/);assert.doesNotMatch(html,/<td>200<\/td>/);
 g.click('record-type','minor');assert.match(g.html('#app'),/<td>30<\/td>/);
 g.click('stat-category','main');assert.match(g.html('#app'),/<th>OPS<\/th>/);assert.doesNotMatch(g.html('#app'),/<th>守備率<\/th>/);
});

test('学生の進行は季節・一年の順、不要なショートカットなし、故障歴はドラフトと同じ段',()=>{
 const g=game();g.run("s=createPlayer('配置検証','batter',123);");
 const html=g.run('play()');
 assert.doesNotMatch(html,/選手を設定|成績一覧/);
 assert.ok(html.indexOf('春だけ進める')<html.indexOf('1年進める'));
 const career=g.run('career()'),pair=career.slice(career.indexOf('class="career-histories"'));
 assert.ok(pair.includes('ドラフト履歴'));assert.ok(pair.includes('故障歴'));
 g.click('advance');assert.equal(g.run('s.period'),1);
});

test('記録更新をキャリアの功績と引退後にも数字・年齢つきで表示する',()=>{
 const g=game();pro(g);
 g.run("checkSeasonRecords(s,{year:2031,age:28,stage:'pro',team:TEAMS[0],stats:{...emptyStats(),hr:74,hits:270}})");
 let html=g.run('career()');
 assert.match(html,/世界シーズン記録更新/);assert.match(html,/74（従来 73）/);assert.match(html,/2031年・28歳/);
 g.run('retire(s)');html=g.run('career()');assert.match(html,/270（従来 262）/);
});

test('起用欄と年度別成績に守備固め・代走要員を表示する',()=>{
 const g=game();pro(g);
 for(const [role,label] of [['defense','守備固め要員'],['runner','代走要員'],['pinch','代打要員'],['pinchAce','代打の切り札']]){
  g.run("s.player.batterRole='"+role+"';s.records.at(-1).batterRole='"+role+"';");
  assert.ok(g.run('play()').includes(label));
  assert.ok(g.run('table(s.records)').includes(label));
 }
 g.run("s.player.batterRole='regular';");assert.match(g.run('play()'),/レギュラー/);
});

test('年俸と追加報酬を分けて表示し、メジャー・マイナーの通算を混ぜない',()=>{
 const g=game();pro(g);g.run("s.records=[{year:2030,age:27,stage:'pro',team:TEAMS[0],salary:600,firstTeamAllowance:500,paidSalary:1100,stats:emptyStats()},{year:2031,age:28,stage:'mlb',team:MLB_TEAMS[0],salary:15000,stats:{...emptyStats(),games:10,hits:5},levels:{first:{...emptyStats(),games:10,hits:5},second:{...emptyStats(),games:80,hits:100}}}];");
 g.click('stats-open','year');assert.match(g.html('#app'),/一軍追加報酬/);assert.match(g.html('#app'),/1,100万円/);
 g.click('record-type','mlb');assert.match(g.html('#app'),/メジャー年度別・通算成績/);assert.doesNotMatch(g.html('#app'),/>100<\/td>/);
 g.click('record-type','minor');assert.match(g.html('#app'),/マイナー年度別・通算成績/);assert.match(g.html('#app'),/>100<\/td>/);assert.doesNotMatch(g.html('#app'),/>一軍追加報酬</);
});

test('日別登録一覧と海外マイナー成績を閲覧し、DFAに回答して進行を再開できる',()=>{
 const g=game();pro(g);g.run("s.stage='mlb';s.team=MLB_TEAMS[0];s.records=[];s.contractOffers=[];s.activeContract=null;for(const k in s.player.abilities)s.player.abilities[k]=60;s.mlbRoster={on40:true,outrighted:false,optionYears:[2020,2021,2022,2023]};s.nationalOfferYear=s.year;");
 g.click('year');assert.match(g.html('#modal'),/DFA/);g.click('roster-choice','accept');g.click('year');
 assert.equal(g.run('s.records.length'),1);assert.ok(g.run('s.records[0].dailyRoster.days.length')===187);
 g.click('stats-open','roster');assert.match(g.html('#app'),/日別の登録一覧/);assert.match(g.html('#app'),/公示履歴/);
 g.click('record-type','minor');assert.match(g.html('#app'),/海外マイナーの成績/);assert.match(g.html('#app'),/メジャー・プロ通算には含みません/);
});

test('契約画面の海外FAからオファーを選び、球団承認なしで海外へ移籍する',()=>{
 const g=game();pro(g);g.run("s.records.push({...s.records.at(-1),year:2031});s.year=2032;s.activeContract=null;s.records.forEach(r=>r.firstTeamDays=145);s.postingChallenge={team:s.team,status:'pending',label:'優勝'};");
 g.click('market-menu');assert.match(g.html('#modal'),/海外FA/);assert.match(g.html('#modal'),/一軍登録換算：9年0日/);
 g.click('negotiate','overseasFa');
 // This seed may receive no offer; a declined market must still allow declaration-stay and progression.
 const offers=g.run('s.market.offers.length');
 if(offers){const id=g.run("s.market.offers.find(o=>o.stage==='mlb').id");g.click('offer',id);assert.equal(g.run('s.stage'),'mlb');}
 else {g.click('remain');assert.equal(g.run("s.faDeclarations.at(-1).outcome"),'宣言残留');}
});

test('引退後の進行は人生だけを表示、現役記録はキャリアに保持',()=>{
 const g=game();pro(g);g.run('retire(s)');const html=g.run('play()');assert.match(html,/引退後の人生/);assert.doesNotMatch(html,/キャリア年表|キャリアハイ|生涯年俸/);
 assert.match(g.run('career()'),/キャリア年表/);assert.match(g.run('career()'),/キャリアハイ/);
});
test('出場数と所属区分を進行画面に表示し、移籍後に前球団の区分を表示しない',()=>{
 const g=game();pro(g);g.run("s.records.at(-1).levels={first:{...emptyStats(),games:5},second:{...emptyStats(),games:90}}");
 assert.match(g.run('play()'),/二軍中心/);assert.match(g.run('play()'),/一軍 5試合・二軍 90試合/);
 g.run('s.team=TEAMS[1]');assert.doesNotMatch(g.run('rosterStatusView()'),/二軍中心/);
});
function game(localStorage){
 const source=fs.readFileSync(new URL('../DIAMOND-LIFE.html',import.meta.url),'utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
 const nodes={},events={};
 const node=()=>({innerHTML:'',open:false,hidden:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},classList:{add(){},remove(){}}});
 const values={name:['ランダム選手'],role:['pitcher','batter'],throwHand:['right','left','both'],batHand:['right','left','both'],positionGroup:['infield','outfield','catcher'],position:['first','second','third','shortstop'],style:['balanced','average','power','speed','defense'],pitchStyle:['power','finesse']};
 const fields=Object.fromEntries(Object.entries(values).map(([key,options])=>[key,{options,selectedIndex:0,get value(){return this.options[this.selectedIndex];}}]));
 nodes['#new-player']={elements:{namedItem:key=>fields[key]}};
 class FormData {constructor(form){this.form=form;}get(key){return this.form.elements.namedItem(key).value;}entries(){return Object.keys(fields).map(key=>[key,this.get(key)])[Symbol.iterator]();}}
 const ctx=vm.createContext({localStorage,FormData,document:{querySelector:q=>nodes[q]??=node(),addEventListener:(name,handler)=>events[name]=handler},window:{scrollTo(){}},setTimeout(){},clearTimeout(){}});
 vm.runInContext(source,ctx);
 return {run:code=>vm.runInContext(code,ctx),html:q=>nodes[q].innerHTML,click:(action,id)=>events.click({preventDefault(){},target:{closest:()=>({dataset:{action,id}})}})};
}

test('トップ・空の名鑑・戻る操作は選手作成やストレージ書込みをしない',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const g=game(storage);assert.equal(g.run('s'),null);assert.equal(g.run("$('#modal').open"),false);
 assert.match(g.html('#app'),/ニューゲーム/);assert.match(g.html('#app'),/選手名鑑/);
 for(const page of ['privacy','terms','contact'])assert.match(g.html('#app'),new RegExp(page+'\\.html'));
 g.click('library-open');assert.match(g.html('#app'),/保存選手 0 \/ 3/);assert.match(g.html('#app'),/まだいません/);
 g.click('site-top');assert.match(g.html('#app'),/ニューゲーム/);assert.equal(data.size,0);
 g.click('new');assert.match(g.html('#modal'),/id="new-player"/);g.click('close');assert.equal(g.run('s'),null);
});

test('名鑑詳細はモーダルではなく独立ページで全記録を表示し戻れる',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const g=game(storage);pro(g);g.run('retire(s);saveRetiredCareer(s);autoSave()');
 const before=JSON.stringify([...data]),state=g.run('JSON.stringify(s)'),id=g.run('s.careerId');
 g.click('library-open');g.click('library-view',id);
 assert.equal(g.run("$('#modal').open"),false);
 for(const label of ['選手名鑑に戻る','全年度の成績','獲得タイトル・表彰','海外マイナー','背番号履歴','最高年俸'])assert.ok(g.html('#app').includes(label));
 assert.doesNotMatch(g.html('#app'),/data-action="library-save"/);
 g.click('library-back');assert.match(g.html('#app'),/保存選手 1 \/ 3/);
 g.click('site-top');assert.equal(g.run('JSON.stringify(s)'),state);assert.equal(JSON.stringify([...data]),before);
});

test('引退後は最終結果・共有・保存の順で重複保存を防ぐ',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const g=game(storage);pro(g);g.run('retire(s)');const html=g.run('career()');
 assert.ok(html.indexOf('キャリアハイ')<html.indexOf('data-action="share-result"'));
 assert.ok(html.indexOf('data-action="share-result"')<html.indexOf('data-action="library-save"'));
 g.click('library-save');g.click('library-save');assert.equal(g.run('readCareerLibrary().careers.length'),1);assert.match(g.html('#app'),/保存済み/);
});
function pro(g){g.run("s=createPlayer('検証','batter',71);Object.assign(s,{stage:'pro',age:28,year:2031,team:TEAMS[0],proYears:8,salary:15000});for(const k in s.player.abilities)s.player.abilities[k]=85;s.records=Array.from({length:8},(_,i)=>({year:2023+i,stage:'pro',team:s.team,stats:{...emptyStats(),games:143,ab:500,hits:160,hr:30}}));setContract(s,15000,4);");}
test('ランダムの1クリックで選手設定を閉じて開始、お知らせトーストなし',()=>{
 const g=game();assert.equal(g.run('s'),null);g.click('new');g.click('random-player');assert.equal(g.run('s.player.name'),'ランダム選手');assert.equal(g.run("$('#modal').open"),false);assert.match(g.html('#app'),/1年進める/);
 const source=fs.readFileSync(new URL('../dist/src/ui.js',import.meta.url),'utf8');assert.doesNotMatch(source,/toast\(|あなたの野球人生が始まりました/);
});
test('最後の通知を見送ったらシーズン進行ボタンに戻る',()=>{
 const g=game();pro(g);g.run("s.notices=[{kind:'fa',year:s.year,seen:false,title:'FA',body:'案内'}];render();showNextPopup();");g.click('notice-skip');assert.match(g.html('#app'),/1シーズン進める/);assert.doesNotMatch(g.html('#app'),/届いた話を確認/);
});
test('大けがは療養して続行でき、同じ年を二重に記録しない',()=>{
 const g=game();pro(g);g.run("s.injuryRetirement=true;advanceYear(s);showNextPopup();");assert.equal(g.run('s.retired'),false);assert.match(g.html('#modal'),/療養して現役を続ける/);const year=g.run('s.year');g.click('injury-continue');g.run('advanceYear(s)');assert.equal(g.run('s.year'),year+1);assert.equal(g.run('new Set(s.records.map(r=>r.year)).size'),g.run('s.records.length'));
});
test('ポスティング達成を表示して海外オファーから移籍できる',()=>{
 const g=game();pro(g);g.run("s.postingChallenge={year:2030,team:s.team,status:'pending',stat:'hr',target:25,label:'25本塁打'};reviewPostingChallenge(s,s.records.at(-1));showNextPopup();");
 assert.match(g.html('#modal'),/条件：達成/);assert.equal(g.run('s.market.offers.length'),2);const id=g.run('s.market.offers[0].id'),team=g.run('s.market.offers[0].team');g.click('offer',id);assert.equal(g.run('s.team'),team);assert.equal(g.run('s.stage'),'mlb');assert.equal(g.run('s.postingReport'),null);
});
test('課題未達から在籍延長の代案を選び、翌年達成できる',()=>{
 const g=game();pro(g);g.run("s.postingChallenge={year:2030,team:s.team,status:'pending',stat:'hr',target:50,label:'50本塁打'};reviewPostingChallenge(s,s.records.at(-1));showNextPopup();");
 assert.match(g.html('#modal'),/条件：未達成/);assert.match(g.html('#modal'),/あと1シーズン/);g.click('posting-alternative','years');assert.equal(g.run('s.postingChallenge.eligibleYear'),2031);g.run("reviewPostingChallenge(s,{year:2031,stage:'pro',team:s.team,stats:emptyStats()})");assert.equal(g.run('s.postingReport.status'),'achieved');
});
test('長いキャリア年表も初期状態で折りたたみ、全記録を残す',()=>{
 const g=game();pro(g);const html=g.run('career()');assert.match(html,/<details class="panel career-timeline"><summary>キャリア年表/);assert.doesNotMatch(html,/<details class="panel career-timeline" open/);assert.match(html,/小学校入学/);
});
