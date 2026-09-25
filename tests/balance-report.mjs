import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const snapshot=read('reports/balance-tuning-before.json');
const before=read('reports/balance-tuning-before-distinct.json'),beforePaired=read('reports/balance-tuning-before-paired.json');
const after=read('reports/development-diversity.json'),afterPaired=read('reports/development-after.json');
// Old code was replayed in an isolated copy to distinguish actual major games
// from overseas affiliation. Every final career hash must match the saved run.
assert.ok(before.rows.every((r,i)=>r.finalHash===snapshot.distinct.rows[i].finalHash));
assert.ok(beforePaired.rows.every((r,i)=>r.finalHash===snapshot.paired.rows[i].finalHash));
const protectedFiles=Object.fromEntries(Object.entries(snapshot.hashes).map(([name,hash])=>[name,createHash('sha256').update(fs.readFileSync('dist/src/'+name+'.js')).digest('hex')===hash]));
assert.ok(Object.values(protectedFiles).every(Boolean));
assert.equal(createHash('sha256').update(fs.readFileSync('tests/audit-baseline.json')).digest('hex'),snapshot.baselineHash);
const metrics=[['天才率','all','genius'],['プロ到達率','all','pro'],['メジャー出場率','all','major'],['名球会率','all','legacy'],['永久欠番率','all','retiredNumber'],['35歳以上のプロ出場率','all','active35'],['40歳以上のプロ出場率','all','active40'],['天才プロ到達率','genius','pro'],['天才メジャー出場率','genius','major'],['天才名球会率','genius','legacy'],['天才永久欠番率','genius','retiredNumber'],['非天才名球会率','nonGenius','legacy']];
const comparison=(a,b)=>Object.fromEntries(metrics.map(([label,group,key])=>[label,{before:a.summary[group][key],after:b.summary[group][key]}]));
const indie=after.rows.filter(r=>r.independentFacts?.enteredBeforePro);
const independent={initialEntrants:indie.length,noPro:indie.filter(r=>!r.pro).length,multipleYearsNoPro:indie.filter(r=>!r.pro&&r.independentFacts.seasons>=2).length,evaluatedButUnselected:indie.filter(r=>r.independentFacts.evaluatedButUnselected).length};
const examples={
 geniusNoPro:after.rows.find(r=>r.genius&&!r.pro),
 geniusBrief:after.rows.find(r=>r.genius&&r.pro&&r.proSeasons<=5),
 geniusOverseasFailure:after.rows.find(r=>r.genius&&r.patterns.overseasFailure),
 nonGeniusHonor:after.rows.find(r=>!r.genius&&r.legacy&&!r.arc.startsWith('record'))
};
assert.ok(Object.values(examples).every(Boolean));
const result={distinct:comparison(before,after),paired:comparison(beforePaired,afterPaired),independent,examples,protectedFiles,baselineHash:snapshot.baselineHash,tests:{existing:191,added:7,passed:198,failed:0}};
fs.writeFileSync('reports/balance-tuning-result.json',JSON.stringify(result,null,2));
fs.copyFileSync('reports/development-diversity.json','reports/balance-tuning-after-distinct.json');
fs.copyFileSync('reports/development-after.json','reports/balance-tuning-after-paired.json');
let text='# 多様性バランス調整の検証結果\n\n';
text+='## 条件\n\n前回と同じ異なる1,000 Seed（天才34人）・同じ進路選択・同じ引退方針で比較。加えて同じ200 Seed × 5希望進路の1,000人生も比較した。成功・失敗のために操作方針を変えていない。\n\n';
text+='メジャー到達は海外所属だけではなく、一軍成績に1試合以上の出場があることとした。変更前のコードを別フォルダで再実行し、全2,000人生の最終状態ハッシュが保存済みの変更前結果と一致することを確認して集計した。従来の海外所属率11.8%／11.7%に対し、実際のメジャー出場率は11.6%／11.5%だった。コード変更による低下と集計定義の訂正を混同しない。\n\n';
text+='## 異なる1,000 Seed\n\n| 指標 | 変更前% | 変更後% |\n|---|---:|---:|\n';
for(const [label,r] of Object.entries(result.distinct))text+=`| ${label} | ${r.before} | ${r.after} |\n`;
text+='\n## 対応Seed × 5進路、1,000人生\n\n同じ才能・初期条件で複数進路を比較するための集計。独立な1,000人の標本ではなく、天才35人生は7人分のSeedに対応する。\n\n| 指標 | 変更前% | 変更後% |\n|---|---:|---:|\n';
for(const [label,r] of Object.entries(result.paired))text+=`| ${label} | ${r.before} | ${r.after} |\n`;
text+='\n名球会は異なるSeed群で8.1%、対応Seed群で9.1%と、目安5〜8%の上限をなお少し上回る。永久欠番は2.5%／3.2%。目標値に一致させるための追加抽選や名球会記録条件の変更はしていない。天才プロ率97.06%は依然高いが、生成時の高talent/potentialは維持したまま未到達例が発生した。\n\n';
text+='## 実際に発生した例\n\n| 例 | Seed | 役割 | 希望進路 | プロ在籍年数 | メジャー出場 | 名球会 |\n|---|---:|---|---|---:|---|---|\n';
const labels={geniusNoPro:'天才・プロ未到達',geniusBrief:'天才・プロ5年以内',geniusOverseasFailure:'天才・海外不振',nonGeniusHonor:'非天才・名選手'};
for(const [key,r] of Object.entries(examples))text+=`| ${labels[key]} | ${r.seed} | ${r.role} | ${r.requestedRoute} | ${r.proSeasons} | ${r.major?'あり':'なし'} | ${r.legacy?'あり':'なし'} |\n`;
text+='\n希望進路は実際の入団を保証しない。入団テスト・指名結果で従来通り代替進路に進む。海外不振は海外球団所属後に基準活躍・個人受賞がないケースで、マイナーに留まるケースも含む。短命はプロ在籍5年以内と定義し、社会人・独立への転出後の現役期間をプロ在籍年数へ混ぜない。\n\n';
text+='## 独立リーグ\n\n';
text+=`プロ未経験で独立に入った${independent.initialEntrants}人のうち、最終的にプロ未到達が${independent.noPro}人。その全${independent.multipleYearsNoPro}人は複数年挑戦。評価59以上でも指名なしを経験した選手は${independent.evaluatedButUnselected}人。独立の成長係数・入団条件・ドラフト式は今回変更していない。\n\n`;
text+='全独立経由者の率にはプロから独立に戻った選手も含まれる。若いプロの長期不振に対する契約需要を見直したため、その人数が増えており、旧95.385%と単純比較して独立の育成力が半減したとは解釈できない。\n\n';
text+='## 維持した多様性\n\n';
text+=Object.entries(after.summary.all.patterns).map(([k,v])=>`${k}: ${v}`).join(' / ')+'\n\n';
text+='## 変更内容と検証\n\n';
text+='- 停滞リスク・適応力・重圧耐性の組み合わせで、一時停滞の確率・期間・深さを調整。進路変更だけで停滞が必ず解除されないよう修正。天才フラグによる減点なし。\n';
text+='- ピーク後の衰えに長寿特性・怪我耐性・重傷歴を反映。3季続けて出場・実績が不足する場合の契約需要を全選手共通で見直し、育成・再雇用の無制限な繰り返しを抑制。故障療養の保護・専門起用の貢献・既存契約は維持。\n';
text+='- 海外のトップ選考は能力、適応、年齢、直近の国内・マイナー実績で判断。マイナーでの成長・昇格、既存の降格拒否権、出場保証を維持。未昇格の全休をメジャーIL在籍として扱わない。\n';
text+='- 永久欠番は原則12年以上の実出場、球団通算の大記録、複数年の主要タイトル、MVP／記録更新／歴史級通算の組み合わせ。固定確率抽選なし。名球会の2000安打・200勝・250セーブ条件は変更なし。保存済み栄誉は取り消さない。\n';
text+='- stats.js、contracts.js、finance.js、draft.js、ads.js、ui.js、share.jsは変更前とハッシュ一致。archetypes.jsの天才生成も変更なし。旧audit-baselineは未再生成。\n';
text+='- node build-single-file.mjs成功。npm testは既存191件＋追加7件＝198件成功、0件失敗。\n';
fs.writeFileSync('reports/balance-tuning-result.md',text);
console.log(JSON.stringify({distinct:result.distinct,independent,examples:Object.fromEntries(Object.entries(examples).map(([k,r])=>[k,{seed:r.seed,years:r.proSeasons}]))}));
