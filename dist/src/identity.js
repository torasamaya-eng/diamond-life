const FAMILY_NAMES=['佐藤','鈴木','高橋','田中','伊藤','渡辺','山本','中村','小林','加藤','吉田','山田','松本','井上','木村','林','清水','斎藤','森','池田','橋本','石川','藤田','岡田','近藤','村上','長谷川','石井','坂本','遠藤'];
const GIVEN_NAMES=['翔太','悠人','大輝','蓮','陽翔','拓海','健太','颯太','直樹','亮介','悠真','航平','大和','陸','優斗','隼人','智也','涼太','和真','一樹','健介','誠','健太郎','颯','翔','陽介','拓也','海斗','駿','悠介'];
// Identity randomness is separate from the seeded baseball simulation.
export function randomPlayerName(){return FAMILY_NAMES[Math.floor(Math.random()*FAMILY_NAMES.length)]+' '+GIVEN_NAMES[Math.floor(Math.random()*GIVEN_NAMES.length)];}
let identitySequence=0;
export function newCareerId(){
 if(globalThis.crypto?.randomUUID)return 'DL-'+globalThis.crypto.randomUUID().replaceAll('-','').toUpperCase();
 if(globalThis.crypto?.getRandomValues){const bytes=new Uint8Array(16);globalThis.crypto.getRandomValues(bytes);return 'DL-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();}
 return 'DL-'+Date.now().toString(36).toUpperCase()+'-'+(++identitySequence).toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,14).toUpperCase();
}
