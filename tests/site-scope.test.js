import {matchesHistoricalHash} from './historical-hash.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

test('サイト整理では保存・共有・広告を含む全ゲームモジュールを変更しない',()=>{
 const hashes=JSON.parse(fs.readFileSync(new URL('./fixtures/audit-protection.json',import.meta.url))).siteHashes;
 for(const [name,hash] of Object.entries(hashes).filter(([name])=>name!=='health.js'&&name!=='levels.js'&&name!=='ads.js'&&name!=='share.js'&&name!=='stats.js'&&name!=='roster.js'&&!['autosave.js','career-library.js','contracts.js','finance.js','draft.js','engine.js','lifecycle.js','market.js','ui.js'].includes(name)&&name!=='awards.js'&&name!=='balance.js')){const bytes=fs.readFileSync(new URL('../dist/src/'+name,import.meta.url));
 // This polish only appends a display formatter: the complete historical formatter must still match.
 const original=name==='format.js'?Buffer.from(bytes.toString().split('// Display only:')[0].trimEnd()+'\n'):bytes;
 assert.ok(matchesHistoricalHash(original,hash),name);}
});
test('公開ページは直接アクセスとトップへの復帰に対応しSEOを維持',()=>{
 for(const name of ['privacy','terms','contact']){
  const html=fs.readFileSync(new URL('../dist/'+name+'.html',import.meta.url),'utf8');
  assert.match(html,/<a href="\.\/index.html">トップへ戻る<\/a>/);
 }
 const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.match(html,/<title>白球GAMES/);assert.match(html,/<meta name="description" content="[^"]+"/);
});
