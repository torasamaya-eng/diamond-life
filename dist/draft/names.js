import {random} from './random.js';

export const SURNAMES=['青柳','寺島','川瀬','宮原','西崎','坂井','辻村','井坂','岩城','三田','藤森','小暮','相沢','橘','荒川','田代','小野寺','有村','石崎','南條','佐藤','鈴木','高橋','田中','伊藤','渡辺','山本','中村','小林','加藤','吉田','山田','佐々木','山口','松本','井上','木村','林','清水','山崎','森','池田','橋本','阿部','石川','山下','中島','石井','小川','前田','岡田','長谷川','藤田','後藤','近藤','村上','遠藤','青木','坂本','斉藤','福田','西村','太田','藤井','岡本','三浦','藤原','松田','中川','中野','原田','小松','安藤','田村','竹内','金子','上田','和田','中山','石田','工藤','酒井','横山','宮崎','内田','高木','安田','谷口','大野','丸山','今井','高田','河野','武田','村田','大塚','平野','菅原','杉山','久保','松井','千葉','岩崎','桜井','木下','野口','松尾','野村','秋山','菊池','永井','大西','小山','本田','吉川','関','泉','新井','浜田','福島'];
export const GIVEN_NAMES=['悠真','拓海','航平','蓮','大樹','直人','蒼太','翔吾','光希','律','湊','颯介','一真','晴斗','圭佑','恭平','翔太','健太','大輔','雄太','和也','直樹','亮介','真司','拓也','達也','祐介','裕也','慎吾','大地','隼人','俊介','康平','修平','淳平','亮太','悠斗','優太','陽介','健一','智也','颯太','優斗','翔','翼','陸','海斗','大和','樹','陽太','奏太','壮真','瑛太','蒼','陽向','悠人','結人','湊斗','朝陽','凛太郎','晴人','健吾','怜央','琉生','駿','一輝','光輝','匠','涼太','雄大','航','哲平','拓馬','泰成','智樹','遥斗','慶太','敬介','龍之介','竜也','昴','佑真','智紀','弘樹','健斗','勇人','裕貴','尚人','克己','将吾','大志','優作','拓郎','元気','駿介','晃','誠','岳','仁','修斗'];

// A separate stream keeps names cosmetic. Candidate abilities and match RNG are unchanged.
export function assignCandidateNames(candidates,seed){
 const rng=random(`${seed}:candidate-names`),used=new Set();let remainingGiven=[];
 for(const c of candidates){let name;
  if(!remainingGiven.length)remainingGiven=[...GIVEN_NAMES];
  const given=remainingGiven.splice(rng.int(0,remainingGiven.length-1),1)[0];
  for(let attempt=0;attempt<100;attempt++){name=`${rng.pick(SURNAMES)} ${given}`;if(!used.has(name))break;}
  if(used.has(name)){name=null;for(const surname of SURNAMES){for(const given of GIVEN_NAMES){const option=`${surname} ${given}`;if(!used.has(option)){name=option;break;}}if(name)break;}}
  if(!name)throw Error('選手名の候補が不足しています');c.name=name;used.add(name);
 }
}
