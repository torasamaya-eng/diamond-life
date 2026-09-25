# 日次ロースター（2026年9月調査）

## 公式資料
- NPB公示（通常抹消は10日後から再登録）: https://npb.jp/announcement/roster/
- 選手会公開・野球協約 第84〜86条: https://jpbpa.net/wp-content/uploads/jpbpa-pdf/agc2223.pdf
- NPB FA説明: https://bis.npb.or.jp/announcement/2018/fa_about.html
- MLBPA Major League Rules（オプション3年・4年目例外）: https://registrationz.mlbpa.org/pdf/MajorLeagueRules.pdf
- MLBオプション: https://www.mlb.com/glossary/transactions/minor-league-options
- MLB DFA: https://www.mlb.com/glossary/transactions/designate-for-assignment
- MiLB公式・取引用語: https://img.mlbstatic.com/milb-images/image/upload/milb/n9smgxkfo9rawmj4z8j7.pdf
- MLB IL: https://www.mlb.com/glossary/injuries/60-day-injured-list
- MLB FA: https://www.mlb.com/glossary/transactions/free-agency

## 実装
通常のNPB登録抹消は当日から出場不可、10日後まで再登録不可。一軍登録中の休養日も日数に算入。
日次状態から一軍・二軍の試合出場数を先に決め、その試合数で既存の打撃・投球成績を計算する。育成は一軍登録不可。
FAは年145日上限、前年実登録145日以上で故障による抹消から復帰まで最大60日の特例を別計上。

海外はメジャー・マイナー・10/15/60日IL・マイナー療養・40人枠内外を管理。
通常オプションは3年、所定の海外プロ実働5年未満なら4年目の例外。年20日以上で1年分を消費、年5回の降格上限。
再昇格待機は野手10日・投手15日。メジャーILはサービスタイムに算入。60日ILは40人枠外。
年20日未満のオプション期間もサービスタイムに加算。年172日上限、6年分でメジャーFA交渉。
在籍5年以上の降格は本人同意を確認。オプション切れの開幕配属はDFAの画面を出し、7日以内の日付でウェーバー獲得・枠外配属を決定。
3年以上の在籍または過去のアウトライト経験がある場合、DFA後の枠外配属を拒否し自由契約を選べる。
既存契約の給与保証は降格で減額しない。マイナーの成績は別タブで見られ、主要タイトル・代表査定・メジャー通算から除外。

## ゲーム上の範囲
操作はシーズン単位のまま。NPB183日・海外187日の架空日程を3月28日から生成し、その全日を内部で処理する。
登録判断・試合日程・ウェーバー獲得判断は架空のシミュレーション。実際の年度別公式日程は取り込まない。
一人の選手の状態を扱うため、登録上限（国内31/ベンチ29、海外26/9月28・保有40）は基準情報として保持する。全球団の他選手全員の枠争いは生成しない。
マイナーは一つの育成リーグとして集約し、AAA以下の階層、Rule 5ドラフト、マイナーFA、年俸調停、ダブルヘッダーの追加枠、感染・脳振盪・投手の開幕/球宴登録特例は未実装。
途中でオプション上限に達した場合は違法な降格をせずメジャーで維持する。次の開幕編成で必要ならDFA/同意を判定する。
既存の主要契約を維持し、マイナー専用契約の細分給与体系を新設しない。
新記録は日別履歴から算入。旧記録には日別履歴を捏造せず、国内FAの旧推定値は互換用、海外の未記録サービス日数はゼロとして扱う。

設定・処理: dist/src/roster.js。成績: levels.js。国内FA: free-agency.js。
