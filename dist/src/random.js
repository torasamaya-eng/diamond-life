export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function random(s){s.seed=(Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296;}
export const between=(s,a,b)=>a+(b-a)*random(s);
export const integer=(s,a,b)=>Math.floor(between(s,a,b+1));
export const pick=(s,items)=>items[Math.floor(random(s)*items.length)];
