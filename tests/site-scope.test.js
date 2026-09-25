import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

test('サイト整理では保存・共有・広告を含む全ゲームモジュールを変更しない',()=>{
 const hashes=JSON.parse(fs.readFileSync(new URL('../reports/site-protected-files.json',import.meta.url)));
 for(const [name,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../dist/src/'+name,import.meta.url))).digest('hex'),hash,name);
});
test('公開ページは直接アクセスとトップへの復帰に対応しSEOを維持',()=>{
 for(const name of ['privacy','terms','contact']){
  const html=fs.readFileSync(new URL('../dist/'+name+'.html',import.meta.url),'utf8');
  assert.match(html,/<a href="\.\/index.html">トップへ戻る<\/a>/);
 }
 const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.match(html,/<title>DIAMOND LIFE/);assert.match(html,/<meta name="description" content="[^"]+"/);
});
