import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PUBLIC_CONFIG,publicLinks,publicHttps} from '../dist/src/public-config.js';
test('未設定の応援リンクは非表示、有効な設定時のみ表示する',()=>{
 const previous=PUBLIC_CONFIG.supportUrl;
 try{
  PUBLIC_CONFIG.supportUrl='';assert.doesNotMatch(publicLinks(),/DIAMOND LIFEを応援する/);
  PUBLIC_CONFIG.supportUrl='javascript:alert(1)';assert.doesNotMatch(publicLinks(),/DIAMOND LIFEを応援する/);
  // Test-only URL, never configured in the application.
  PUBLIC_CONFIG.supportUrl='https://example.test/support';assert.match(publicLinks(),/DIAMOND LIFEを応援する/);assert.match(publicLinks(),/noopener noreferrer/);
  assert.equal(publicHttps('https://user:secret@example.test'),'');
 }finally{PUBLIC_CONFIG.supportUrl=previous;}
});
test('公開ページは実在し、広告は未導入、問い合わせ先の捏造や広告タグがない',()=>{
 for(const name of ['privacy','terms','contact']){
  const html=fs.readFileSync(new URL('../dist/'+name+'.html',import.meta.url),'utf8');
  assert.match(html,/<html lang="ja">/);assert.match(html,/public.js/);assert.doesNotMatch(html,/adsbygoogle|mailto:|example\.com/);
 }
 const privacy=fs.readFileSync(new URL('../dist/privacy.html',import.meta.url),'utf8');
 assert.match(privacy,/Google Fonts/);assert.match(privacy,/現在は未導入/);assert.match(privacy,/localStorage/);
 assert.equal(PUBLIC_CONFIG.contactUrl,'');assert.equal(PUBLIC_CONFIG.contactEmail,'');
});
