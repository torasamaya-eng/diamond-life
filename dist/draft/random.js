export function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function random(seed){let s=hash(seed);return {next(){s=(s+0x6D2B79F5)|0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;},int(a,b){return a+Math.floor(this.next()*(b-a+1));},pick(a){return a[this.int(0,a.length-1)];},normal(){return (this.next()+this.next()+this.next()+this.next()-2)*1.73;}};}
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const round=(x,n=0)=>Number(x.toFixed(n));
