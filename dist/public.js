import {PUBLIC_CONFIG,publicHttps,publicEscape,publicLinks} from './src/public-config.js';
document.querySelector('#site-links').innerHTML=publicLinks('./');
const contact=document.querySelector('#contact-destination');
if(contact){
 const url=publicHttps(PUBLIC_CONFIG.contactUrl),email=PUBLIC_CONFIG.contactEmail.trim();
 if(url)contact.innerHTML='<a href="'+publicEscape(url)+'" target="_blank" rel="noopener noreferrer">お問い合わせ窓口を開く</a>';
 else if(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))contact.innerHTML='<a href="mailto:'+encodeURIComponent(email)+'">'+publicEscape(email)+'</a>';
}
