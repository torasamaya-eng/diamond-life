import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('単体配布HTMLのスクリプトに構文エラーと外部モジュール依存がない',()=>{
 const html=fs.readFileSync(new URL('../DIAMOND-LIFE.html',import.meta.url),'utf8');
 const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(source);assert.doesNotMatch(source,/^import /m);new vm.Script(source);
 assert.match(source,/schoolScouting/);assert.match(source,/requestPitchRole/);
});
