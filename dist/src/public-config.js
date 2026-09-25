// 問い合わせ先を設定すると、お問い合わせページに表示されます。
export const PUBLIC_CONFIG={contactUrl:'',contactEmail:'hakkyujinsei@gmail.com'};

export function publicHttps(value){
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';
  }catch{
    return '';
  }
}

export function publicEscape(value){
  return String(value).replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

export function publicLinks(base=''){
  return '<nav aria-label="サイト情報" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px;font-size:12px"><a href="'+base+'privacy.html">プライバシーポリシー</a><a href="'+base+'terms.html">利用規約</a><a href="'+base+'contact.html">お問い合わせ</a></nav>';
}

export function gamePublicLinks(){
  return publicLinks(globalThis.location?.pathname.endsWith('/DIAMOND-LIFE.html')?'./dist/':'./');
}