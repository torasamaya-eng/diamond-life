import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyStats,ops,sumStats,decimal} from '../dist/src/stats.js';
test('OPSは出塁率と長打率の和、通算は合計成績から計算する',()=>{
 const a={...emptyStats(),ab:100,hits:30,doubles:5,triples:2,hr:3,bb:10,hbp:2,sf:3};
 const b={...emptyStats(),ab:300,hits:60,doubles:10,triples:0,hr:5,bb:20,hbp:0,sf:0};
 assert.equal(ops(emptyStats()),0);
 assert.equal(ops(a),42/115+48/100);
 assert.equal(ops(sumStats([a,b])),122/435+133/400);
 assert.notEqual(ops(sumStats([a,b])),(ops(a)+ops(b))/2);
 assert.equal(decimal(ops({...emptyStats(),ab:10,hits:5,hr:2})), '1.600');
});
