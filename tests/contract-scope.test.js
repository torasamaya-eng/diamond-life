import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import {matchesHistoricalHash} from './historical-hash.mjs';
test('契約改修で成績生成・成長・怪我・FA日数・広告・シェア・永久欠番を変更しない',()=>{
 const hashes=JSON.parse(fs.readFileSync(new URL('./fixtures/contract-scope.json',import.meta.url)));
 for(const [name,hash] of Object.entries(hashes).filter(([name])=>name!=='ads'))assert.ok(matchesHistoricalHash(fs.readFileSync(new URL('../dist/src/'+name+'.js',import.meta.url)),hash),name);
});
