import {teamName} from './data.js';
import {performance} from './stats.js';
export const MANAGER_RULES={years:10,productiveYears:7,merit:2};
export function managerEligible(s,team=s.team){
 const stages=['pro','mlb','independent'],rows=s.records.filter(r=>stages.includes(r.stage));
 const clubs=new Set([...rows,...s.teams.filter(t=>stages.includes(t.stage))].map(r=>teamName(r.team)).filter(Boolean));
 if(clubs.size!==1||!clubs.has(teamName(team)))return false;
 const seasons=new Map();for(const r of rows){if(r.partial)continue;seasons.set(r.year,r);}
 const productive=[...seasons.values()].filter(r=>performance(r.stats,s.player.role)>=MANAGER_RULES.merit&&(s.player.role==='pitcher'?r.stats.outs>=150:r.stats.games>=80));
 return seasons.size>=MANAGER_RULES.years&&productive.length>=MANAGER_RULES.productiveYears;
}
export function careerPromise(s,p){return p?{...p,role:p.role==='manager'&&!managerEligible(s,p.team)?'coach':p.role}:null;}
export function directOverseasProspect(s){const first=s.teams.find(t=>['pro','mlb','independent'].includes(t.stage));return s.proEntry?.route==='overseasDirect'||first?.stage==='mlb'&&first.from==='overseas';}

