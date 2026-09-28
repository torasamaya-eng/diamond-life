import {spawnSync} from 'node:child_process';import fs from 'node:fs';import assert from 'node:assert/strict';
fs.mkdirSync('reports',{recursive:true});const outcomes=[];
function run(name,cmd,args){console.log('\nRelease: '+name);const r=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:32*1024*1024});fs.writeFileSync('reports/release-'+name+'.log',(r.stdout||'')+(r.stderr||''));outcomes.push({name,passed:r.status===0,exit:r.status});fs.writeFileSync('reports/release-runner.json',JSON.stringify(outcomes,null,2));if(r.status!==0){console.error((r.stdout||'').slice(-6000)+(r.stderr||'').slice(-4000));throw Error(name+' failed');}console.log((r.stdout||'').slice(-1000));return r;}
// Verify source/standalone parity. A stale bundle is a release failure; do not silently publish it.
const before=fs.readFileSync('DIAMOND-LIFE.html','utf8').replace(/\r\n/g,'\n');run('build',process.execPath,['build-single-file.mjs']);assert.equal(fs.readFileSync('DIAMOND-LIFE.html','utf8').replace(/\r\n/g,'\n'),before,'Standalone was stale; build and rerun release');
for(const file of fs.readdirSync('dist/src').filter(f=>f.endsWith('.js')))run('syntax-'+file,process.execPath,['--check','dist/src/'+file]);
const tests=fs.readdirSync('tests').filter(f=>f.endsWith('.test.js')).map(f=>'tests/'+f);const unit=run('unit',process.execPath,['--test',...tests]);const total=Number(unit.stdout.match(/tests (\d+)/)?.[1]);assert.ok(total>=318,'Existing test count must not decrease');
run('storage',process.execPath,['tests/release-storage-measure.mjs']);
run('contracts-browser',process.execPath,['tests/contracts-browser-check.mjs']);
run('browser',process.execPath,['tests/release-browser.mjs']);
run('site-browser',process.execPath,['tests/site-browser-check.mjs']);
run('simulation',process.execPath,['tests/release-simulation.mjs']);
run('diff-check','git',['diff','--check']);
console.log('Release checks passed: '+total+' unit tests, Chromium/WebKit, storage, matrices, '+(process.env.RELEASE_CAREERS||1000)+' careers');
