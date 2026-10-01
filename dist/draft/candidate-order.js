import {CONFIG} from './config.js';
import {random} from './random.js';

const directories=new WeakMap();

// Presentation only: keep the featured shortlist, but never rank within it.
// Separate random streams leave candidate generation and draft RNG untouched.
export function candidateNumbers(state){
 let numbers=directories.get(state);
 if(numbers)return numbers;
 const featuredCount=state.config?.featuredCount??CONFIG.featuredCount;
 const groups=[[],[]];
 for(const c of state.candidates)groups[c.rank<=featuredCount?0:1].push(c.id);
 numbers=new Map();
 for(let group=0;group<groups.length;group++){
  const ids=groups[group].sort(),rng=random(`${state.seed}:candidate-directory:${group}`);
  for(let i=ids.length-1;i>0;i--){const j=rng.int(0,i);[ids[i],ids[j]]=[ids[j],ids[i]];}
  for(const id of ids)numbers.set(id,numbers.size+1);
 }
 directories.set(state,numbers);
 return numbers;
}

export function orderCandidates(state,candidates){
 const numbers=candidateNumbers(state);
 return [...candidates].sort((a,b)=>numbers.get(a.id)-numbers.get(b.id));
}
