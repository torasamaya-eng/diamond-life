import fs from 'node:fs';import assert from 'node:assert/strict';
import {longCareer} from './release-fixtures.mjs';
import {compactCareerState,expandCareerState,createCareerArchiveSnapshot} from '../dist/src/archive.js';
import {writeAutosave} from '../dist/src/autosave.js';
const bytes=x=>Buffer.byteLength(typeof x==='string'?x:JSON.stringify(x),'utf8'),out=[];fs.mkdirSync('reports',{recursive:true});
for(const name of ['NPB20','MLB20','mixed30','maximum']){
 const s=longCareer(name),packed=compactCareerState(s),raw=JSON.stringify(s);assert.deepEqual(expandCareerState(JSON.parse(JSON.stringify(packed))),JSON.parse(raw));
 let auto;writeAutosave(s,{setItem:(_,v)=>auto=v});const snapshot=createCareerArchiveSnapshot(s);
 out.push({name,years:s.records.length,before:{state:bytes(raw),autosave:bytes(JSON.stringify({version:1,savedAt:new Date().toISOString(),checksum:'00000000',payload:raw})),library1:bytes({version:1,careers:[{careerId:s.careerId,state:s}]}),library3:bytes({version:1,careers:[s,s,s].map((state,i)=>({careerId:'DL-'+i,state}))}),records:bytes(s.records),dailyRoster:bytes(s.records.map(r=>r.dailyRoster)),rosterHistory:bytes(s.rosterHistory),periodResults:bytes(s.periodResults),timeline:bytes(s.timeline)},after:{autosave:bytes(auto),library1:bytes(snapshot),library3:bytes(snapshot)*3,storage:'IndexedDB',dailyRosterCopies:packed.rosters.length}});
 fs.writeFileSync('reports/release-storage-'+name+'.json',raw);
}
fs.writeFileSync('reports/release-storage-after.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out.map(r=>({name:r.name,beforeAuto:r.before.autosave,afterAuto:r.after.autosave,beforeLibrary3:r.before.library3,afterLibrary3:r.after.library3}))));
