// New seasons use actual daily game registration records. Legacy seasons keep a deterministic estimate.
export const FA_RULES={daysPerSeason:145,seasonDays:183,domestic:8,collegeCorporate:7,overseas:9,reacquire:4,injuryMax:60,source:'https://bis.npb.or.jp/announcement/2018/fa_about.html'};
export function entryDomesticYears(s){
 if(s.domesticEntry)return s.domesticEntry.draftYear>=2007&&['university','corporate'].includes(s.domesticEntry.route)?7:8;
 const entry=s.teams.find(t=>t.stage==='pro'),draft=s.drafts.find(d=>d.team&&d.type!=='指名なし'&&(!entry||d.year===entry.year-1));
 const route=draft?.stage||entry?.from;
 return (draft?.year??entry?.year??0)>=2007&&['university','corporate'].includes(route)?7:8;
}
export function estimateRegisteredDays(s,r,loss=0){
 if(r.stage!=='pro'||r.contractStatus==='development')return 0;
 const first=r.levels?.first?.games??r.stats?.games??0,second=r.levels?.second?.games;
 const full=s.player.role==='pitcher'?((r.pitchRole||s.player.pitchRole)==='starter'?30:65):143;
 const share=second===undefined?Math.min(1,first/full):first/Math.max(1,first+second);
 return Math.max(0,Math.min(FA_RULES.seasonDays,Math.round(FA_RULES.seasonDays*share*Math.max(0,1-loss))));
}
export function recordFAService(s,r,injury=null){
 if(r.stage!=='pro')return;
 if(r.dailyRoster){r.firstTeamDays=r.dailyRoster.counts.active;r.faInjuryDays=Math.min(r.dailyRoster.counts.injuryCredit,Math.max(0,145-r.firstTeamDays));r.faDays=Math.min(145,r.firstTeamDays+r.faInjuryDays);return;}
 r.firstTeamDays=estimateRegisteredDays(s,r,injury?.lost||0);
 const previous=s.records.findLast(p=>p.stage==='pro'&&p.year===r.year-1);
 const prevDays=previous?(previous.firstTeamDays??estimateRegisteredDays(s,previous)):0;
 r.faInjuryDays=r.contractStatus!=='development'&&injury&&prevDays>=145?Math.min(60,Math.ceil((injury.lost||0)*183),Math.max(0,145-r.firstTeamDays)):0;
 r.faDays=Math.min(145,r.firstTeamDays+r.faInjuryDays);
}
export function faService(s){
 const years=new Map();let estimated=false;
 for(const r of s.records){if(r.stage!=='pro')continue;
 let days;if(r.contractStatus==='development')days=0;else if(Number.isFinite(r.faDays))days=r.faDays;else if(Number.isFinite(r.firstTeamDays))days=r.firstTeamDays;else{days=estimateRegisteredDays(s,r);estimated=true;}
 days=Math.max(0,Math.min(145,days));years.set(r.year??('legacy-'+years.size),Math.min(145,(years.get(r.year)||0)+days));
 }
 const total=[...years.values()].reduce((a,b)=>a+b,0);
 const last=s.faDeclarations?.at(-1);
 // Old transfer records also reset qualification; their pre-transfer service is counted once.
 const oldMove=!last?s.moves.filter(m=>['fa','overseasFa'].includes(m.kind)).at(-1):null;
 const base=last?.serviceDays??(oldMove?s.records.filter(r=>r.stage==='pro'&&r.year<oldMove.year).reduce((n,r)=>n+Math.min(145,r.faDays??r.firstTeamDays??estimateRegisteredDays(s,r)),0):0);
 const repeat=!!(last||oldMove),credited=Math.max(0,total-base),domesticYears=repeat?4:entryDomesticYears(s),overseasYears=repeat?4:9;
 return {total,credited,repeat,estimated,domesticYears,overseasYears,domesticDays:Math.max(0,domesticYears*145-credited),overseasDays:Math.max(0,overseasYears*145-credited)};
}
export function faRemaining(days){return days?('あと'+Math.floor(days/145)+'年'+(days%145)+'日'):'取得済み';}
export function declareFA(s,kind){
 s.faDeclarations??=[];if(s.faDeclarations.at(-1)?.year===s.year)return;
 const service=faService(s);
 s.faDeclarations.push({year:s.year,kind,team:s.team,serviceDays:service.total,outcome:'交渉中'});
 s.noticeFlags.fa=false;s.noticeFlags.overseasFa=false;
 s.timeline.push({year:s.year,text:(kind==='overseasFa'?'海外FA':'国内FA')+'権を行使。国内で再契約した場合、以後4シーズン分の一軍登録で海外FAを再取得'});
}
export function finishFA(s,outcome){const d=s.faDeclarations?.at(-1);if(d?.year===s.year)d.outcome=outcome;}
