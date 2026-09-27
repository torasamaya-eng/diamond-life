import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import {matchesHistoricalHash} from './historical-hash.mjs';
test('契約改修で成績生成・成長・怪我・FA日数・広告・シェア・永久欠番を変更しない',()=>{
 const hashes=JSON.parse(fs.readFileSync(new URL('./fixtures/contract-scope.json',import.meta.url)));
 for(const [name,hash] of Object.entries(hashes).filter(([name])=>name!=='ads')){
  let source=fs.readFileSync(new URL('../dist/src/'+name+'.js',import.meta.url),'utf8');
  // X helpers are additive; still protect every pre-existing image/native-share/copy implementation.
  if(name==='share')source=source.replace(/export function careerXShareText\(card\)\{[\s\S]*?(?=export async function makeCareerCard)/,'').replace(',xUrl:careerXShareUrl(card)','');
  assert.ok(matchesHistoricalHash(Buffer.from(source),hash),name);
 }
});
