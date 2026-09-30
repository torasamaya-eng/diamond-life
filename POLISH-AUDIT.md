# 白球人生 iPhone実機報告後の仕上げ検証

基準: `cd8bbdae85382167441a9a458bae65bdeb0c2657`。再開時は前回の3点の仕上げが未コミット（追跡6ファイル変更、新規実装2ファイル）であり、その差分を継承した。baselineは318件成功。保護バックアップは未追跡のまま、SHA256不変。

## 一言寸評

`classifyCareerNarrative()`が完成年度の上位リーグ成績、入団に使ったドラフト、進路、故障、復帰、起用、表彰、栄誉、優勝年、キャリアハイ、現役期間を評価する。根拠と候補を返し、主テーマ1つ・副テーマ最大1つを重み順で選ぶ。劇的な這い上がりがある場合はlegendを副テーマにできる。`careerReview()`は1〜2文へ変換する。

36選手像のfixture、矛盾防止、辞退した指名と実際の入団の区別、主力経験のない復活の捏造防止、旧アーカイブの再生成を確認した。genius/potential/lostStarは期待や適応の補助に限り、arcだけで成功と断定しない。RNG・state・年度別事実を変更せず、旧保存の寸評も閲覧時に再評価する。

- twoLeagueStar：国内で培った力をメジャーでも示し、両方の舞台でスターとして活躍した。高い水準の活躍を続けた安定感も持ち味だった。
- lateStar：若い頃は主役ではなかったが、遅れて訪れた全盛期にスターの座をつかんだ。
- independentClimber：独立リーグを経て国内一軍の主力へはい上がり、遠回りを実績に変えた。
- injuryComeback：長期離脱を伴う大けがを乗り越え、再び一軍の主力として居場所をつかんだ。
- geniusDisappointment：高い素質を持ちながら、長く主役を張るまでには伸び切らなかった。

## DFA / option

2022–2026 CBA XIX(A)(2)とXX(D)(1)–(4)を照合。既存の3年以上のoutright時FA選択権、5年以上のminor assignment同意要件、過去outrightは維持。前季Super Two資格によるFA選択権を補完した。Super Twoは既存給与モデルと同じ固定service cutoffによる近似であり、実制度のリーグ全体上位22%を新設していない。

- FA選択権なし：同意ボタンを廃止し「ウェーバー結果を確認する」。拒否ボタンなし。
- 3年以上 / 過去outright / 前季Super Two：マイナー配属に代えて自由契約を選択可能。
- 5年以上：同意・降格拒否を区別し、既存の残留 / トレード / 自由契約ルートを保持。
- claim：新球団と「40人枠へ」を即時結果画面に表示。
- clear：「40人枠外でマイナー配属」を即時表示。
- option：通常の配属同意として表示し、DFAと混同せず40人枠を維持。

既存claim確率と乱数消費は維持。手続き結果を返しUIが表示する最小限の変更。

根拠：[CBA](https://www.mlbplayers.com/_files/ugd/4d23dc_d6dfc2344d2042de973e37de62484da5.pdf)、[Outright Waivers](https://www.mlb.com/glossary/transactions/outright-waivers)、[Minor League Options](https://www.mlb.com/glossary/transactions/minor-league-options)。

## 海外給与表示

|内部（万円）|従来|変更後|
|---|---|---|
|7842.3417|7,842万3,417円|約7,842万円|
|1906.5|1,906万5,000円|約1,907万円|
|15000.0123|1億5,000万123円|約1億5,000万円|

`salaryMoney()`は海外の表示だけ万円単位へ丸める。国内の`money(6.6667)`は「6万6,667円」のまま。USD $127,100も不変。オートセーブ・引退archiveのsalary、paidSalary、majorPay/minorPay、totalSalaryと算術結果が完全一致するテストを追加。国内復帰直後の前年海外給与、海外オファーの出来高、保存選手の表示も確認した。年俸査定・契約・会計処理は変更していない。

## 最終結果

- `npm.cmd test`：382 passed / 0 failed（既存318件を保持）。
- `RELEASE_CAREERS=5000 npm.cmd run test:release`：PASS。全source `node --check`、standalone再生成・parity、quota / migration、contract / return / posting matrix、diff checkを含む。
- 追加browser：Chromium70 / WebKit70、320・375・390・430・1280px、140ケースPASS、page errors 0。modal画面内・44px以上の操作域・即時結果・円表示・USD・保存寸評を確認。
- 既存browser：画面 / 保存28ケース、契約28ケース、公開ページ39チェックPASS。
- 5,000人生：完走5,000 / 失敗0。プロ 73.56%、メジャー 6.24%、40歳以上 3.72%、永久欠番 1.42%。基準との集計比較はJSONに記録。
- money invariants：signingDuplicate、setupDuplicate、postingPlayerIncome、NaN、Infinity、negativeMoney、contractTotalMismatch、paidSalaryMismatch、formerNpbRedraftがすべて0。
- 寸評：空文、例外、undefined / NaN / Infinity、明白な矛盾タグ、state変更がすべて0。
- IndexedDB旧名鑑migrationと3人保存・再読込、圧縮round-trip成功。33年careerはautosave 約276万→68万bytes、名鑑3人 約713万→186万bytes。今回codec・保存schemaは変更していない。
- 実機iPhone Safariは未確認。WebKitの成功と区別する。
- 保護backup SHA256：`775c52c286ff34bc80fd214b574a73ade53fe0daec6acb4106553402408b152a`。編集・削除・add・commitなし。

機械可読結果と対象sourceのSHA256は`POLISH-VALIDATION.json`に保存。`RELEASE-VALIDATION.json`と`tests/audit-baseline.json`は変更していない。commit / pushの結果は作業完了報告に記載する。
