import {rates} from './stats.js';
import {fitNeeds,fulfilledRole,needProgress} from './teams.js';
import {TEAMS} from './config.js';
export function careerFacts(r){const ys=r.rows,t=r.total,role=r.role;
 const rotation=ys.filter(y=>y.role==='先発'&&y.stats.outs>=270&&rates(y.stats).era<=4.5).length,regular=ys.filter(y=>y.stats.ab>=300&&y.stats.games>=85&&rates(y.stats).ops>=.68).length;
 const roleYears=name=>ys.filter(y=>y.role===name&&y.stats.games>=40).length;
 const defenseYears=ys.filter(y=>y.stats.games>=50&&y.defense?.contribution>=2&&(y.defense.tools.catching+y.defense.tools.range)/2>=65).length;
 const good=ys.filter(y=>role==='投手'?y.stats.wins>=10||y.stats.outs>=360&&rates(y.stats).era<3.6||y.stats.saves>=20||y.stats.holds>=25:y.stats.ab>=300&&rates(y.stats).ops>=.74).length;
 return {rotation,regular,defenseYears,good,doubleDigit:ys.filter(y=>y.stats.wins>=10).length,defensive:roleYears('守備固め'),utility:roleYears('ユーティリティ'),runner:roleYears('代走'),pinch:roleYears('代打'),relief:role==='投手'?ys.filter(y=>y.role!=='先発'&&y.stats.games>=35&&rates(y.stats).era<=4.5).length:0,setup:ys.filter(y=>y.stats.holds>=20).length,games:t.games,topYears:ys.filter(y=>y.stats.games>0).length,promoted:ys.some(y=>y.contract==='支配下'),era:rates(t).era};
}
export function evaluateCareer(r,c=null,needs=null){
 const f=careerFacts(r),t=r.total,pitch=r.role==='投手',productive=pitch?t.outs>0&&f.era<=4.2:t.ab>0&&rates(t).ops>=.72;let absolute='一軍定着できず',rank=0;
 if(productive&&((pitch&&(t.wins>=250||t.saves>=400))||(!pitch&&(t.hits>=2800||t.hr>=500)))){absolute='レジェンド';rank=6;}
 else if(productive&&((pitch&&(t.wins>=180||t.saves>=280))||(!pitch&&(t.hits>=2200||t.hr>=350)))){absolute='スーパースター';rank=5;}
 else if(productive&&((pitch&&(t.wins>=120||t.saves>=180))||(!pitch&&(t.hits>=1600||t.hr>=230)))){absolute='スター';rank=4;}
 else if(pitch&&f.rotation>=5&&f.era<=3.4){absolute='エース';rank=4;}
 else if(!pitch&&t.hr>=160){absolute='主砲';rank=4;}
 else if(f.rotation>=8||f.regular>=8){absolute=pitch?'長期ローテーション投手':'長期主力';rank=3;}
 else if(t.saves>=80){absolute='守護神';rank=3;}
 else if(f.setup>=4||t.holds>=120){absolute='セットアッパー';rank=3;}
 else if(f.rotation>=3||f.doubleDigit>=2){absolute='ローテーション投手';rank=3;}
 else if(f.defenseYears>=4&&(f.defensive>=3||f.regular<4)){absolute='守備職人';rank=3;}
 else if(f.regular>=3){absolute='レギュラー';rank=3;}
 else if(f.utility>=3){absolute='ユーティリティ';rank=2;}
 else if(f.runner>=3){absolute='代走要員';rank=2;}
 else if(f.pinch>=3){absolute='代打';rank=2;}
 else if(f.relief>=4){absolute='救援の仕事人';rank=3;}
 else if(f.good>=1){absolute='短期活躍';rank=2;}
 else if(t.games>=(pitch?100:300)){absolute='一軍戦力';rank=2;}
 else if(f.topYears>=3&&t.games>=(pitch?25:70)){absolute='一軍と二軍を往復';rank=1;}
 else if(r.pick.development&&!f.promoted){absolute='育成のまま終了';}
 else if(r.pick.development&&f.promoted&&t.games===0){absolute='支配下昇格';rank=1;}
 else if(c&&(c.velocity>=153||c.exitVelocity>=174||c.height>=190)&&t.games<(pitch?25:70)){absolute='未完の大器';}
 let expectation;
 if(rank>=5||rank>=3&&r.pick.development||rank>=4&&r.pick.round>=3)expectation='期待を大きく上回った';
 else if(rank>=4||rank>=3&&r.pick.round>=3)expectation='期待以上';
 else if(rank>=3||f.doubleDigit>=2)expectation='期待に応えた';
 else if(rank>=2&&(r.pick.round>=3||r.pick.development))expectation='おおむね期待に応えた';
 else if(rank>=2||r.pick.development&&f.promoted)expectation='一定の成果を残した';
 else if(rank===1)expectation='やや期待を下回った';else expectation='期待に届かなかった';
 // A brief appearance or one good season is not a successful first-round career.
 const sustained=Math.max(f.rotation,f.regular,f.relief,f.setup,f.defenseYears,f.utility,f.runner,f.pinch);
 if(!r.pick.development&&r.pick.round===1&&rank<4&&sustained<3)expectation=rank===0?'期待に届かなかった':'期待を下回った';
 if(r.pick.development&&rank===1&&t.games===0)expectation='期待に届かなかった';
 const descriptions={
 'レジェンド':'球史を語るうえで欠かせない実績を積み重ねた。','スーパースター':'長い期間にわたり、球界を代表する存在として活躍した。','スター':'一軍の中心で実績を重ね、球団の枠を越えて知られる選手になった。','エース':'勝利数だけでなく投球内容と継続して回を担う力で、先発陣を支えた。','主砲':'長打力を武器に、打線の中軸として存在感を残した。','長期ローテーション投手':f.doubleDigit>=2?'長く先発ローテーションを守り、何度も二桁勝利を記録した。':'白星の数だけで測れない投球回を重ね、長く先発陣を支えた。','長期主力':'一軍の定位置を長く守り、チームの編成を支える存在だった。','ローテーション投手':'先発として継続的に試合を任され、ローテーションの一角を担った。','守護神':'終盤の重要な場面を任され、セーブを積み重ねた。','セットアッパー':'勝負所の救援を担い、後ろの投手へ試合をつないだ。','救援の仕事人':'短い回を繰り返し任され、救援陣を長く支えた。','守備職人':'捕球と守備範囲を武器に、一軍で必要とされ続けた。','ユーティリティ':'複数の守備位置で起用に応え、ベンチの選択肢を広げた。','代走要員':'走力を生かして途中出場の役割を担い、一軍に居場所を作った。','代打':'限られた打席で打撃を求められ、代打として起用された。','レギュラー':'一軍の定位置をつかみ、複数年にわたり主力としてプレーした。','一軍戦力':'絶対的な主役ではなくても、一軍で任される役割を見つけた。','一軍と二軍を往復':'昇降格を経験しながら一軍への挑戦を続けたが、定位置の確保には至らなかった。','短期活躍':'一軍で鮮やかな活躍を残した時期があったが、長期の定着とは別のキャリアになった。','支配下昇格':'育成契約から支配下登録を勝ち取ったが、一軍出場には届かなかった。','育成のまま終了':'育成の場で挑戦を続けたが、支配下への昇格には至らなかった。','未完の大器':'計測で示した身体的な魅力を、一軍での継続した実績へ結び付け切れなかった。','一軍定着できず':'一軍で任される機会を十分につかめず、定着には至らなかった。'};
 const prefix=r.pick.development&&f.promoted&&rank>=3?'育成から支配下を勝ち取り、一軍の主力へ成長した。':descriptions[absolute];
 const evidence=pitch?(t.outs?`通算${t.wins}勝・${t.saves}セーブ、防御率${rates(t).era.toFixed(2)}。内容を伴って先発を担った年は${f.rotation}年。`:'一軍で投球回を記録できなかった。'):(t.ab?`通算${t.hits}安打・${t.hr}本塁打、OPS ${rates(t).ops.toFixed(3)}。打席数と内容を伴う主力シーズンは${f.regular}年。`:'一軍で打数を記録できなかった。');
 let caveat='';if(f.good===1&&rank<=2)caveat='好成績は一時的で、継続した主力定着には結び付かなかった。';
 else if(pitch&&t.outs>=270&&rates(t).era>4.5)caveat='登板機会は得たが、失点を抑える内容には課題が残った。';
 else if(!pitch&&t.ab>=500&&rates(t).ops<.68)caveat=f.defenseYears>=3?'打撃は低調。評価できるのは守備で残した役割だった。':'出場量に対して打撃の貢献は乏しく、主力と呼べる内容には届かなかった。';
 else if(f.topYears<=2&&t.games>0)caveat='一軍での活躍期間は短く、通算の積み上げは限られた。';
 const narrative=evidence+(caveat||prefix)+`${r.pick.development?'育成指名':r.pick.round+'位指名'}として${expectation}キャリアだった。`;
 const fits=c?fitNeeds(c,needs):[],success=fits.filter(n=>r.rows.some((y,i)=>y.team===TEAMS[r.pick.team]&&(n.type!=='即戦力'||i<3)&&fulfilledRole(y,n)));
 const needReview=needs===null?'指名時の補強要求が記録されていないため判定しません。':success.length?`${success.map(n=>n.label).join('・')}という狙いに担当球団で応えた。${needProgress(r,success[0],TEAMS[r.pick.team]).text}`:fits.length?'候補像は補強要求に合致したが、担当球団で求めた時期・役割への定着には課題が残った。':rank>=4?'当初の緊急補強とは異なる指名だったが、長期的には大きな成功となった。':'当初の補強要求とは異なる選択をしたが、大きな実績には結び付かなかった。';
 return {absolute,rank,expectation,narrative,needReview,facts:f};
}
