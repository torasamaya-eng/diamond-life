import {sessionCareer} from './career.js';
export function lostCandidates(s){
 const lost=new Set(s.lotteries.flat().filter(b=>b.teams.includes(s.playerTeam)&&b.winner!==s.playerTeam).map(b=>b.id));
 return s.candidates.filter(c=>lost.has(c.id)&&!s.picks.some(p=>p.team===s.playerTeam&&p.id===c.id));
}
export function watchedCandidates(s){
 const lost=lostCandidates(s).map(c=>c.id);
 const ids=new Set([...(s.favorites||[]),...(s.fallbacks||[]),...Object.keys(s.board||{}),...(s.compareIds||[]),...lost]);
 return s.candidates.filter(c=>ids.has(c.id)&&!s.picks.some(p=>p.team===s.playerTeam&&p.id===c.id));
}
export function revealWatched(s,id){
 if(s.phase!=='results')throw Error('自分の指名選手の答え合わせ後に確認できます');
 if(!watchedCandidates(s).some(c=>c.id===id))throw Error('比較・検討した候補ではありません');
 const p=s.picks.find(p=>p.id===id);if(!p)return {undrafted:true,route:s.undrafted?.find(x=>x.id===id)?.route||'指名なし。プロ入り後の経歴はまだありません。'};
 s.watchedResults??={};if(!s.watchedResults[id])s.watchedResults[id]=sessionCareer(s,id);
 return s.watchedResults[id];
}
