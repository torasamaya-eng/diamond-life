import test from 'node:test';
import assert from 'node:assert/strict';
import {TEAMS,DOMESTIC_LEAGUES,OVERSEAS_LEAGUES,TEAM_CATALOG,TEAM_ALIASES,teamName,displayNames,migrateTeamNames} from '../dist/src/data.js';
import {MLB_TEAMS} from '../dist/src/market.js';
test('23球団・4リーグは独自名で、候補順・球団数・表示用IDを維持する',()=>{
 assert.deepEqual(DOMESTIC_LEAGUES.map(l=>l.name),['セントリーグ','パシフィアリーグ']);
 assert.deepEqual(OVERSEAS_LEAGUES.map(l=>l.name),['フロンティアリーグ','コンチネンタルリーグ']);
 assert.deepEqual([...DOMESTIC_LEAGUES,...OVERSEAS_LEAGUES].map(l=>l.teams.length),[6,6,6,5]);
 assert.equal(TEAMS.length,12);assert.equal(MLB_TEAMS.length,11);assert.equal(new Set(TEAM_CATALOG.map(t=>t.id)).size,23);
 assert.ok(TEAM_CATALOG.every(t=>t.logo===null&&t.colors===null));
 for(const t of [...TEAMS,...MLB_TEAMS])assert.equal(teamName(t),t);
 for(const old of ['大阪タイガー','九州ホークス','レッツ','センリーグ','アメリカンリーグ'])assert.ok(![...TEAMS,...MLB_TEAMS,...DOMESTIC_LEAGUES.map(l=>l.name),...OVERSEAS_LEAGUES.map(l=>l.name)].includes(old));
});
test('旧名は履歴・契約・移籍・引退後の文章まで変換し、選手名・ID・数値は変更しない',()=>{
 const s={seed:123,player:{name:'大阪タイガー'},team:'大阪タイガー',records:[{team:'ニューヨークヤンキー',stats:{hits:120},teamResult:{league:'アメリカンリーグ'}}],market:{offers:[{id:'old-team-id',team:'レッツ',salary:20000}]},moves:[{from:'横浜スターズ',to:'神宮スワローズ'}],timeline:[{text:'大阪タイガーへ移籍しセンリーグ優勝'}],news:['レッツからオファー'],afterlife:{teams:['レッツ'],entries:[{team:'レッツ',text:'レッツの監督に就任'}]}};
 migrateTeamNames(s);assert.equal(s.player.name,'大阪タイガー');assert.equal(s.seed,123);assert.equal(s.team,'大阪ブレイバーズ');assert.equal(s.records[0].stats.hits,120);assert.equal(s.records[0].teamResult.league,'フロンティアリーグ');assert.equal(s.market.offers[0].id,'old-team-id');assert.equal(s.market.offers[0].salary,20000);assert.equal(s.afterlife.teams[0],'シンシナティ・クリムゾンズ');assert.match(s.timeline[0].text,/セントリーグ/);
 const once=JSON.stringify(s);migrateTeamNames(s);assert.equal(JSON.stringify(s),once);
 assert.equal(displayNames('大阪タイガーズから移籍'),'大阪ブレイバーズから移籍');
 assert.equal(teamName('東京スワローウィングス'),'神宮ウイングス');
});
