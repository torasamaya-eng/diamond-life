import fs from 'node:fs';
const files=['public-config','identity','data','random','format','balance','development','records','archetypes','personality','profile','fielding','stats','health','growth','scouting','levels','youth','draft','national','awards','championship','career-rules','afterlife','events','career-types','finance','contracts','free-agency','roster','lifecycle','market','engine','storage','autosave','share','ads','career-library','ui'];
const script=files.map(f=>'// '+f+'\n'+fs.readFileSync(`dist/src/${f}.js`,'utf8').replace(/^import .*?;\s*$/gm,'').replace(/^export /gm,'')).join('\n');
const css=fs.readFileSync('dist/style.css','utf8').replace(/^@import[^;]+;/m,'')+'\n'+fs.readFileSync('dist/theme.css','utf8')+'\n'+fs.readFileSync('dist/numbers.css','utf8');
const html=fs.readFileSync('dist/index.html','utf8').replace('<link rel="stylesheet" href="./style.css"><link rel="stylesheet" href="./theme.css"><link rel="stylesheet" href="./numbers.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="./src/ui.js"></script>',()=>`<script type="module">${script.replace(/<\/script/gi,'<\\/script')}</script>`);
fs.writeFileSync('DIAMOND-LIFE.html',html);
console.log('Standalone game: DIAMOND-LIFE.html');
