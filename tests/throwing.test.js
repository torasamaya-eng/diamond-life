import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';
import {simulateFielding,ensureThrowing} from '../dist/src/fielding.js';
import {emptyStats,sumStats} from '../dist/src/stats.js';
import {grow} from '../dist/src/growth.js';
test('肩力と送球は独立し、強肩は外野補殺、正確な送球は失策減に寄与する',()=>{
 const s=createPlayer('送球','batter',123);s.stage='pro';s.player.batterRole='regular';s.player.position='right';
 Object.assign(s.player.abilities,{field:80,arm:20,throwing:80});
 const low=simulateFielding(s,{...emptyStats(),games:140});s.player.abilities.arm=95;
 const high=simulateFielding(s,{...emptyStats(),games:140});assert.ok(high.assists>low.assists);
 s.player.position='shortstop';s.player.abilities.throwing=20;
 const wild=simulateFielding(s,{...emptyStats(),games:140});s.player.abilities.throwing=95;
 const accurate=simulateFielding(s,{...emptyStats(),games:140});
 assert.ok(wild.throwingErrors>accurate.throwingErrors);assert.ok(wild.errors>accurate.errors);
 assert.ok(accurate.doublePlays>wild.doublePlays);
 assert.ok(wild.throwingErrors<=wild.errors);
 assert.equal(sumStats([wild,accurate]).throwingErrors,wild.throwingErrors+accurate.throwingErrors);
});
test('送球は成長し、旧データの能力補完は乱数や他の能力を変更しない',()=>{
 const s=createPlayer('送球','batter',123);s.age=20;s.stage='university';
 s.player.abilities.throwing=40;s.player.potential.throwing=99;
 grow(s,{growth:1.4,competition:50});assert.ok(s.player.abilities.throwing>40);
 delete s.player.abilities.throwing;delete s.player.potential.throwing;
 const seed=s.seed,arm=s.player.abilities.arm;ensureThrowing(s);
 assert.equal(s.seed,seed);assert.equal(s.player.abilities.arm,arm);
 assert.ok(Number.isFinite(s.player.abilities.throwing));
 assert.ok(s.player.potential.throwing>=s.player.abilities.throwing);
});
