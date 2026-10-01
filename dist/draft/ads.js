// No SDK, publisher ID or production activation is included in this alpha.
export const AD_CONFIG=Object.freeze({enabled:false,timeoutMs:1200,displayTimeoutMs:120000});
const pending=new WeakMap();
export function requestDraftCareerAd(state,{config=AD_CONFIG,adapter=null,persist=()=>{}}={}){
 if(pending.has(state))return pending.get(state);
 if(state.phase!=='drafted'||state.adAttempted)return Promise.resolve('ineligible');
 state.adAttempted=true;try{persist();}catch{}
 const promise=new Promise(resolve=>{
  if(!config.enabled){resolve('disabled');return;}
  let finished=false,timer;const finish=status=>{if(finished)return;finished=true;clearTimeout(timer);resolve(status);};
  try{if(!adapter?.ready?.()){finish('not-ready');return;}timer=setTimeout(()=>finish('timeout'),config.timeoutMs);
   const result=adapter.request({type:'next',name:'draft-career',beforeAd(){clearTimeout(timer);timer=setTimeout(()=>finish('display-timeout'),config.displayTimeoutMs);},afterAd(){finish('shown');},adBreakDone(info){finish(info?.breakStatus||'no-ad');}});
   if(result?.catch)result.catch(()=>finish('error'));
  }catch{finish('error');}
 });pending.set(state,promise);return promise;
}
