import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PUBLIC_CONFIG,publicLinks,publicHttps} from '../dist/src/public-config.js';

test('公開リンクはプライバシー・利用規約・お問い合わせのみ表示する',()=>{
 const links=publicLinks();
 assert.match(links,/privacy\.html/);
 assert.match(links,/terms\.html/);
 assert.match(links,/contact\.html/);
 assert.doesNotMatch(links,/応援する|support-button/);
 assert.equal(publicHttps('https://user:secret@example.test'),'');
});

test('公開ページは実在し、広告は未導入、正式な問い合わせ先を表示する',()=>{
 for(const name of ['privacy','terms','contact']){
  const html=fs.readFileSync(new URL('../dist/'+name+'.html',import.meta.url),'utf8');
  assert.match(html,/<html lang="ja">/);
  assert.match(html,/public\.js/);
  assert.doesNotMatch(html,/adsbygoogle/);
 }

 const privacy=fs.readFileSync(new URL('../dist/privacy.html',import.meta.url),'utf8');
 assert.match(privacy,/Google Fonts/);
 assert.match(privacy,/現在は未導入/);
 assert.match(privacy,/localStorage/);

 const contact=fs.readFileSync(new URL('../dist/contact.html',import.meta.url),'utf8');
 assert.match(contact,/hakkyujinsei@gmail\.com/);

 assert.equal(PUBLIC_CONFIG.contactUrl,'');
 assert.equal(PUBLIC_CONFIG.contactEmail,'hakkyujinsei@gmail.com');
});