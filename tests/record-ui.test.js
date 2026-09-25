import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function screen(started=true){
 const html=fs.readFileSync(new URL('../DIAMOND-LIFE.html',import.meta.url),'utf8');
 const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
 const node={innerHTML:'',addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},classList:{add(){},remove(){}}};
 const ctx=vm.createContext({document:{querySelector:()=>node,addEventListener(){}},window:{scrollTo(){}},setTimeout(){},clearTimeout(){}});
 vm.runInContext(source,ctx);if(started)vm.runInContext("s=createPlayer();",ctx);return code=>vm.runInContext(code,ctx);
}

test('初回はトップから選手未作成のまま既存設定画面を開く',()=>{
 const run=screen(false);assert.equal(run('s'),null);assert.equal(run("document.querySelector('#modal').open"),false);
 assert.match(run("document.querySelector('#app').innerHTML"),/ニューゲーム/);
 run('requestNewLife()');
 const html=run("document.querySelector('#modal').innerHTML");assert.match(html,/id="new-player"/);assert.match(html,/グラウンドへ/);assert.match(html,/data-action="close"/);
});
test('世界野球選手権・世界スポーツ大会は時代フィルターに左右されず、出場分だけ通算表示する',()=>{
 const run=screen();
 run(`s.nationalHistory=[
 {year:2030,age:22,name:'世界野球選手権',selected:true,participated:true,result:'優勝',stats:{...emptyStats(),games:7,ab:20,hits:10,hr:3}},
 {year:2034,age:26,name:'世界野球選手権',selected:true,participated:false,result:'辞退'},
 {year:2038,name:'世界野球選手権',selected:false},
 {year:2032,age:24,name:'世界スポーツ大会',selected:true,result:'準優勝',stats:{...emptyStats(),games:5,ab:10,hits:2}}
 ];filter='elementary';recordType='wbc';`);
 const wbc=run('statsView()');assert.match(wbc,/1回出場 ／ 1回優勝/);assert.match(wbc,/2030 \/ 優勝/);assert.match(wbc,/\.500/);assert.match(wbc,/招集・辞退/);assert.match(wbc,/選出なし/);assert.doesNotMatch(wbc,/2032 \/ 準優勝/);
 run("recordType='olympics';s.player.role='pitcher';s.nationalHistory[3].stats={...emptyStats(),games:2,outs:18,er:1,so:8};");
 const oly=run('statsView()');assert.match(oly,/1回出場 ／ 0回優勝/);assert.match(oly,/2032 \/ 準優勝/);assert.match(oly,/防御率/);assert.match(oly,/1\.50/);
});
test('キャリア年表は年齢を表示し、成績リンク欄を削除して故障歴を維持',()=>{
 const run=screen();run("s.timeline=[{year:CONFIG.startYear,text:'小学校入学'},{year:CONFIG.startYear+12,text:'高校卒業'}];");
 const html=run('career()');assert.match(html,/>6歳<\/small>/);assert.match(html,/>18歳<\/small>/);assert.match(html,/故障歴/);assert.doesNotMatch(html,/<h2>成績・獲得タイトル<\/h2>/);
});
test('キャリアの国内と海外の優勝回数・年度を別集計する',()=>{
 const run=screen();run("s.records=[{year:2030,age:22,stage:'pro',team:'大阪タイガー',teamResult:{leagueChampion:true,japanChampion:true}},{year:2032,age:24,stage:'mlb',team:'レッツ',teamResult:{leagueChampion:true,worldChampion:true}},{year:2033,age:25,stage:'mlb',team:'レッツ',teamResult:{leagueChampion:true,worldChampion:false}}];");
 const html=run('championshipView()');
 const domestic=html.split('<h3 class="subheading">国内</h3>')[1].split('<h3 class="subheading">海外</h3>')[0];
 const overseas=html.split('<h3 class="subheading">海外</h3>')[1];
 assert.match(domestic,/リーグ優勝 1回 ／ 日本一 1回/);assert.match(domestic,/2030年/);assert.doesNotMatch(domestic,/2032年/);
 assert.match(overseas,/リーグ優勝 2回 ／ ワールドシリーズ優勝 1回/);assert.match(overseas,/2032年/);assert.doesNotMatch(overseas,/2030年|日本一/);
});
test('旧球団名の成績・契約・表彰・海外移籍・引退後の表示を新名称へ統一',()=>{
 const run=screen();run(`s.team='大阪タイガー';s.records=[{year:2030,age:22,stage:'pro',team:'大阪タイガー',salary:10000,stats:emptyStats()}];s.timeline=[{year:2030,text:'大阪タイガーへ入団'}];s.awards=[{year:2030,team:'大阪タイガー',title:'本塁打王',stats:emptyStats()}];s.contracts=[{year:2030,team:'横浜スターズ',salary:10000,nextSalary:12000}];s.honors=[{title:'永久欠番',team:'神宮スワローズ',number:6}];s.drafts=[{year:2030,type:'支配下',rank:1,team:'大阪タイガー',salary:1000,bonus:1000,score:90}];s.retired=true;s.afterlife={route:'コーチ',startAge:40,titles:1,teams:['大阪タイガー'],reputation:'経験豊富',entries:[{year:2050,age:42,text:'九州ホークスの監督に就任'}]};`);
 const html=run("career()+table(s.records)+salaryChart()+awardRow(s.awards[0])+afterlifeView()+table([{year:2031,stage:'mlb',team:'ロサンゼルスドラース',stats:emptyStats()}])");
 for(const name of ['大阪ブレイバーズ','横浜セイラーズ','神宮ウイングス','福岡オーシャンズ','ロサンゼルス・スターライト'])assert.ok(html.includes(name),name);
 for(const name of ['大阪タイガー','横浜スターズ','神宮スワローズ','九州ホークス','ロサンゼルスドラース'])assert.ok(!html.includes(name),name);
});
