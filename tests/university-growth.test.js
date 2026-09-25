import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';
import {CAREER_TYPES,arcGrowth,arcEvent} from '../dist/src/archetypes.js';
import {grow} from '../dist/src/growth.js';

test('大学覚醒型は抽選され、国内・海外大学でのみ成長が加速する',()=>{
 assert.equal(CAREER_TYPES.reduce((n,t)=>n+t.weight,0),100);
 let found=0;
 for(let i=1;i<=1000;i++)if(createPlayer('大学型','batter',i*17137).player.arc==='universityBloom')found++;
 assert.ok(found>50&&found<130);
 for(const stage of ['university','overseas']){
  for(const role of ['batter','pitcher']){
   const s=createPlayer('大学型',role,123);delete s.player.recordTalent;
   s.stage=stage;s.age=20;s.player.arc='universityBloom';s.player.arcEvent=false;
   for(const key in s.player.abilities){s.player.abilities[key]=45;s.player.potential[key]=95;}
   const control=structuredClone(s);control.player.arc='ordinary';
   const before=Object.values(s.player.abilities).reduce((a,b)=>a+b,0);
   grow(s,{competition:50,growth:1.2});grow(control,{competition:50,growth:1.2});
   const total=x=>Object.values(x.player.abilities).reduce((a,b)=>a+b,0);
   assert.ok(total(s)-before>(total(control)-before)*1.8);
   const count=s.timeline.length;arcEvent(s);assert.equal(s.timeline.length,count);
   assert.ok(s.timeline.some(t=>t.text.includes(stage==='overseas'?'海外大学で才能が開花':'大学で才能が開花')));
   s.stage='pro';assert.equal(arcGrowth(s),1);
   s.stage='high';s.age=17;assert.equal(arcGrowth(s),.85);
  }
 }
});
