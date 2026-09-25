// Preparation only: no publisher IDs, ad IDs, SDK loading or network requests.
export const FINAL_CAREER_AD_CONFIG={enabled:false,timeoutMs:8000};
const finalAdLedgerPrefix='diamond-life.final-career-ad.';
let finalCareerAdAdapter=null;
export function setFinalCareerAdAdapter(adapter){finalCareerAdAdapter=adapter;}
// Call only with an initialized, consent-ready SDK. Never pass a queueing stub.
export function createH5CareerAdapter({adBreak,isReady,cancel=()=>{}}){
 return {ready:()=>isReady()===true,request:callbacks=>adBreak({
  type:'browse',name:'final-career',
  beforeAd:callbacks.beforeAd,
  afterAd:()=>callbacks.done('completed'),
  adBreakDone:info=>callbacks.done(info?.breakStatus||'completed')
 }),cancel};
}
export async function runFinalCareerAd(state,options={}){
 if(!state?.retired||!state.careerId)return 'ineligible';
 if(state.finalCareerAd?.attempted)return 'already-attempted';
 // Reserve the opportunity before any SDK call or await, including disabled/no-fill paths.
 state.finalCareerAd={attempted:true,status:'reserved'};
 const finish=status=>{state.finalCareerAd.status=status;try{options.persist?.();}catch{}return status;};
 let storage;
 try{
  storage=options.storage??globalThis.localStorage;
  if(!storage)return finish('storage-unavailable');
  const key=finalAdLedgerPrefix+state.careerId;
  if(storage.getItem(key)!==null)return finish('already-attempted');
  storage.setItem(key,'attempted');
 }catch{return finish('storage-unavailable');}
 try{options.persist?.();}catch{}
 if(!(options.config??FINAL_CAREER_AD_CONFIG).enabled)return finish('disabled');
 const adapter=options.adapter??finalCareerAdAdapter;
 try{if(!adapter||adapter.ready?.()!==true)return finish('not-ready');}catch{return finish('error');}
 const delay=Math.min(15000,Math.max(1,(options.config??FINAL_CAREER_AD_CONFIG).timeoutMs||8000));
 return new Promise(resolve=>{
  let settled=false,timer;
  const done=status=>{if(settled)return;settled=true;clearTimeout(timer);resolve(finish(status));};
  timer=setTimeout(()=>{try{adapter.cancel?.();}catch{}done('timeout');},delay);
  try{
   const result=adapter.request({beforeAd:()=>{},done});
   // Some adapters return a promise; H5 itself completes via callbacks.
   if(result?.then)result.then(()=>done('completed'),()=>done('error'));
  }catch{done('error');}
 });
}
