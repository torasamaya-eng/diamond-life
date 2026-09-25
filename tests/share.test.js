import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer} from '../dist/src/engine.js';
import {emptyStats} from '../dist/src/stats.js';
import {careerCardData,careerShareText,makeCareerCard,canShareCareerFile,shareCareerFile,SHARE_GAME_URL} from '../dist/src/share.js';
function retired(role='batter'){
 const s=createPlayer('山田 太郎',role,123);s.retired=true;
 s.records=[{year:2030,stage:'pro',salary:5000,stats:{...emptyStats(),games:120,ab:400,hits:120,hr:20,outs:450,wins:15,er:30,so:180}},{year:2031,stage:'mlb',salary:12000,stats:{...emptyStats(),games:100,ab:300,hits:90,hr:15,outs:300,wins:10,er:20,so:110},levels:{second:{...emptyStats(),hits:999}}}];
 s.awards=[{title:'最優秀選手（MVP）'},{title:'本塁打王'}];
 s.allStars=[{selected:true},{selected:false}];s.drafts=[{type:'支配下',rank:1}];
 s.honors=[{title:'永久欠番',team:'東京クラウンズ',number:6},{title:'名球会入り'}];return s;
}
test('主要成績を投打別に選び、二軍を混ぜず、ゲーム状態を変更しない',()=>{
 const s=retired(),before=JSON.stringify(s),card=careerCardData(s);
 assert.equal(card.metrics.find(([k])=>k==='安打')[1],210);assert.equal(card.metrics.length,6);
 assert.ok(card.highlights.some(v=>v.includes('永久欠番')));assert.ok(card.highlights.length<=4);
 assert.ok(card.facts.includes('MVP 1回 ／ オールスター 1回'));assert.ok(card.facts.includes('メジャー経験 1年'));
 assert.equal(JSON.stringify(s),before);
 const p=careerCardData(retired('pitcher'));assert.equal(p.metrics.find(([k])=>k==='勝利')[1],25);assert.ok(!p.metrics.some(([k])=>k==='安打'));
 assert.equal(SHARE_GAME_URL,'https://hakkyu-jinsei.com/');assert.match(careerShareText(card),/#白球人生/);assert.match(careerShareText(card),/https:\/\/hakkyu-jinsei\.com\//);
 assert.throws(()=>careerCardData(createPlayer()),/引退後/);
});
test('カードは1080×1350のPNGで、必要なブランド表記を含む',async()=>{
 const prior=globalThis.document,drawn=[];
 const ctx={fillRect(){},strokeRect(){},measureText:t=>({width:String(t).length*20}),fillText:t=>drawn.push(t)};
 const canvas={getContext:()=>ctx,toBlob:cb=>cb(new Blob(['png'],{type:'image/png'})),toDataURL:()=> 'data:image/png;base64,cG5n'};
 globalThis.document={createElement:()=>canvas};
 try{const asset=await makeCareerCard(retired());assert.equal(canvas.width,1080);assert.equal(canvas.height,1350);assert.equal(asset.blob.type,'image/png');assert.ok(drawn.includes('白球人生'));assert.ok(drawn.includes('#白球人生'));}
 finally{globalThis.document=prior;}
});
test('ファイル共有の対応・非対応・キャンセル・API失敗を処理する',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator'),asset={blob:new Blob(['png'],{type:'image/png'}),filename:'card.png',text:'#白球人生'};
 const set=value=>Object.defineProperty(globalThis,'navigator',{configurable:true,value});
 try{
  set({});assert.equal(canShareCareerFile(asset),false);assert.equal(await shareCareerFile(asset),false);
  let payload;set({canShare:()=>true,share:async p=>{payload=p;}});
  assert.equal(await shareCareerFile(asset),true);assert.equal(payload.files[0].type,'image/png');assert.equal(payload.text,asset.text);
  set({canShare:()=>true,share:async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'});}});assert.equal(await shareCareerFile(asset),true);
  set({canShare:()=>true,share:async()=>{throw Error('unsupported');}});assert.equal(await shareCareerFile(asset),false);
 }finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
