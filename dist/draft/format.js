// Internal money stays in 万円; this module formats display only.
export function formatMoney(amount){
 if(!Number.isFinite(amount)||amount<0)return '—';
 const man=Math.round(amount),oku=Math.floor(man/10000),rest=man%10000;
 return oku?`${oku.toLocaleString('ja-JP')}億${rest?rest.toLocaleString('ja-JP')+'万':''}円`:`${man.toLocaleString('ja-JP')}万円`;
}
