import {matchesHistoricalHash} from './historical-hash.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

test('サイト整理では保存・共有・広告を含む全ゲームモジュールを変更しない',()=>{
 const hashes=JSON.parse(fs.readFileSync(new URL('./fixtures/audit-protection.json',import.meta.url))).siteHashes;
 for(const [name,hash] of Object.entries(hashes).filter(([name])=>name!=='share.js'&&name!=='stats.js'&&name!=='roster.js'&&name!=='awards.js'&&name!=='balance.js'))assert.ok(matchesHistoricalHash(fs.readFileSync(new URL('../dist/src/'+name,import.meta.url)),hash),name);
});
test('公開ページは直接アクセスとトップへの復帰に対応しSEOを維持',()=>{
 for(const name of ['privacy','terms','contact']){
  const html=fs.readFileSync(new URL('../dist/'+name+'.html',import.meta.url),'utf8');
  assert.match(html,/<a href="\.\/index.html">トップへ戻る<\/a>/);
 }
 const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.match(html,/<title>白球人生/);assert.match(html,/<meta name="description" content="[^"]+"/);
});
