// Preparation only: no publisher IDs, ad IDs, SDK loading or network requests.
export const FINAL_CAREER_AD_CONFIG={enabled:false,timeoutMs:8000};
export const NEW_CAREER_AD_CONFIG={enabled:false,timeoutMs:1200,displayTimeoutMs:120000};
const finalAdLedgerPrefix='diamond-life.final-career-ad.';
const newAdLedgerPrefix='diamond-life.new-career-ad.';
export const CAREER_AD_LEDGER_KEY='diamond-life.career-exit-ads';
export const MAX_AD_LEDGER_CAREERS=128;
function reserveCareerAd(storage,id){
 const raw=storage.getItem(CAREER_AD_LEDGER_KEY),ledger=raw?JSON.parse(raw):[];
 if(!Array.isArray(ledger)||ledger.some(x=>typeof x!=='string'))throw Error('Invalid ad ledger');
 const legacy=[];
 if(typeof storage.key==='function')for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(finalAdLedgerPrefix)||key?.startsWith(newAdLedgerPrefix))legacy.push(key);}
 const already=ledger.includes(id)||[finalAdLedgerPrefix,newAdLedgerPrefix].some(prefix=>storage.getItem(prefix+id)!==null);
 const migrated=legacy.map(key=>key.slice(key.startsWith(finalAdLedgerPrefix)?finalAdLedgerPrefix.length:newAdLedgerPrefix.length));
 const next=[...new Set([...migrated,...ledger].filter(x=>x!==id)),id].slice(-MAX_AD_LEDGER_CAREERS);
 storage.setItem(CAREER_AD_LEDGER_KEY,JSON.stringify(next));
 // Delete legacy keys only after the replacement ledger has been written successfully.
 for(const key of legacy)storage.removeItem?.(key);
 return !already;
}
let finalCareerAdAdapter=null,newCareerAdAdapter=null;
export function setFinalCareerAdAdapter(adapter){finalCareerAdAdapter=adapter;}
export function setNewCareerAdAdapter(adapter){newCareerAdAdapter=adapter;}
// Call only with an initialized, consent-ready SDK. Never pass a queueing stub.
export function createH5CareerAdapter({adBreak,isReady,cancel=()=>{}},placement='final-career'){
 return {ready:()=>isReady()===true,request:callbacks=>adBreak({
  type:placement==='new-career'?'next':'browse',name:placement,
  beforeAd:callbacks.beforeAd,
  afterAd:()=>callbacks.done('completed'),
  adBreakDone:info=>callbacks.done(info?.breakStatus||'completed')
 }),cancel};
}
export function createH5NewCareerAdapter(options){return createH5CareerAdapter(options,'new-career');}
export function runFinalCareerAd(state,options={}){
 if(!state?.retired||!state.careerId)return Promise.resolve('ineligible');
 return runCareerExitAd(state,'finalCareerAd',options,FINAL_CAREER_AD_CONFIG,finalCareerAdAdapter);
}
export function runNewCareerAd(state,options={}){
 if(!state?.careerId||!Array.isArray(state.records)||!state.records.some(r=>!r.partial))return Promise.resolve('ineligible');
 return runCareerExitAd(state,'newCareerAd',options,NEW_CAREER_AD_CONFIG,newCareerAdAdapter);
}
async function runCareerExitAd(state,field,options,defaults,defaultAdapter){
 if(state.finalCareerAd?.attempted||state.newCareerAd?.attempted)return 'already-attempted';
 // Reserve before SDK calls/await; both exit placements share one opportunity.
 state[field]={attempted:true,status:'reserved'};
 const finish=status=>{state[field].status=status;try{options.persist?.();}catch{}return status;};
 try{
  const storage=options.storage??globalThis.localStorage;
  if(!storage)return finish('storage-unavailable');
  if(!reserveCareerAd(storage,state.careerId))return finish('already-attempted');
 }catch{return finish('storage-unavailable');}
 try{options.persist?.();}catch{}
 const config=options.config??defaults;
 if(!config.enabled)return finish('disabled');
 const adapter=options.adapter??defaultAdapter;
 try{if(!adapter||adapter.ready?.()!==true)return finish('not-ready');}catch{return finish('error');}
 const delay=Math.min(15000,Math.max(1,config.timeoutMs||defaults.timeoutMs));
 return new Promise(resolve=>{
  let settled=false,timer;
  const done=status=>{if(settled)return;settled=true;clearTimeout(timer);resolve(finish(status));};
  const timeout=()=>{try{adapter.cancel?.();}catch{}done('timeout');};
  timer=setTimeout(timeout,delay);
  try{
   const result=adapter.request({beforeAd:()=>{
    // A late SDK callback must not display over a new career. H5 requires this callback to succeed.
    if(settled)throw Error('Ad opportunity expired');
    clearTimeout(timer);
    timer=setTimeout(timeout,Math.max(delay,config.displayTimeoutMs||120000));
   },done});
   if(result?.then)result.then(()=>done('completed'),()=>done('error'));
  }catch{done('error');}
 });
}
