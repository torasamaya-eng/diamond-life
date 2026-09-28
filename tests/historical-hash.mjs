import {createHash} from 'node:crypto';
// Preserve historical logic hashes; permit LF/CRLF and only the release-authorized route explanation.
export function matchesHistoricalHash(bytes,expected){
 const text=bytes.toString().replace('都市対抗を目指す。大学卒は2季、高校卒は3季後のドラフト対象。元国内プロは登録2季後に復帰交渉。','都市対抗を目指しながら、毎年のドラフトに挑戦する。'),lf=text.replace(/\r\n/g,'\n');
 return [text,lf,lf.replace(/\n/g,'\r\n')].some(s=>createHash('sha256').update(s).digest('hex')===expected);
}
