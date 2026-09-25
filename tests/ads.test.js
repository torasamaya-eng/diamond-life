import test from 'node:test';
import assert from 'node:assert/strict';
import {runFinalCareerAd,createH5CareerAdapter} from '../dist/src/ads.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const state=()=>({retired:true,careerId:'DL-TESTCAREER'});
test('未設定時は通信せず終了、同一人生は再開後も一度だけ',async()=>{
 const s=state(),storage=memory();let calls=0;
 const adapter={ready:()=>true,request:()=>calls++};
 assert.equal(await runFinalCareerAd(s,{storage,adapter}),'disabled');assert.equal(calls,0);
 assert.equal(await runFinalCareerAd(state(),{storage,adapter,config:{enabled:true}}),'already-attempted');
});
test('成功・広告在庫なし・エラー・ブロック・通知重複で必ず完了する',async()=>{
 for(const mode of ['viewed','noAdPreloaded','error','throw','blocked']){
  let callback,cancelled=0;
  const result=await runFinalCareerAd(state(),{storage:memory(),config:{enabled:true,timeoutMs:5},adapter:{ready:()=>true,cancel:()=>cancelled++,request:cb=>{
   callback=cb;if(mode==='throw')throw Error('offline');if(mode!=='blocked')cb.done(mode);
  }}});
  assert.equal(result,mode==='throw'?'error':mode==='blocked'?'timeout':mode);
  callback.done('late');if(mode==='blocked')assert.equal(cancelled,1);
 }
});
test('保存拒否・未初期化・現役中は広告を呼ばず、連打も二重要求しない',async()=>{
 let calls=0,done;const adapter={ready:()=>true,request:c=>{calls++;done=c.done;}};
 assert.equal(await runFinalCareerAd(state(),{storage:{getItem(){throw Error('blocked');}},adapter,config:{enabled:true}}),'storage-unavailable');
 assert.equal(await runFinalCareerAd({...state(),retired:false},{adapter}),'ineligible');
 assert.equal(calls,0);
 const s=state(),storage=memory(),options={storage,adapter,config:{enabled:true,timeoutMs:100}};
 const pending=runFinalCareerAd(s,options);assert.equal(await runFinalCareerAd(s,options),'already-attempted');assert.equal(calls,1);done('viewed');assert.equal(await pending,'viewed');
});
test('H5アダプターは指定の一箇所だけをbrowseとして呼ぶ',()=>{
 let request,status;
 const adapter=createH5CareerAdapter({isReady:()=>true,adBreak:value=>{request=value;}});
 adapter.request({beforeAd(){},done:value=>{status=value;}});
 assert.equal(request.type,'browse');assert.equal(request.name,'final-career');request.adBreakDone({breakStatus:'noAdPreloaded'});assert.equal(status,'noAdPreloaded');
});
