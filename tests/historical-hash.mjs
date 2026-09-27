import {createHash} from 'node:crypto';
// Keep the original historical hash: permit only Git's LF/CRLF checkout change.
export function matchesHistoricalHash(bytes,expected){
 const text=bytes.toString(),lf=text.replace(/\r\n/g,'\n');
 return [text,lf,lf.replace(/\n/g,'\r\n')].some(s=>createHash('sha256').update(s).digest('hex')===expected);
}
