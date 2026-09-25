# 拡張前監査（2026-09-25）

対象はこの作業フォルダの DIAMOND LIFE。依頼文の「白球人生」に合わせた名称変更は行っていない。
開始時、作業フォルダと outputs/diamond-life で git status / git branch --show-current を実行したが、いずれも Git リポジトリではなかった。ブランチ・未コミット差分は確認不能。reset / checkout / 既存ファイルの破棄は実施していない。

## 構成・入口

- dist/index.html → dist/src/ui.js → engine.js。単体版は build-single-file.mjs → DIAMOND-LIFE.html。開発配信は server.js。
- UI は選択・描画・通知・オートセーブを担当。ゲームは単一の状態オブジェクト s を各関数へ渡す。隠し特性をグローバル変数へ追加する必要はない。
- engine.js: createPlayer / advance / advanceYear / finishYear / nextYear / choose / chooseEmployment / retire。
- 学校・進路・リーグ・球団・能力ラベルは data.js。位置・起用・投打・スタイルは profile.js。CSSとUI構成は今回変更していない。

## 実装確認表

|機能|実際の処理・注意|
|---|---|
|小学生・中学・高校|engine.advance は春夏秋を進行。6・3・3学年、年度末の記録と進路待ち。学校別環境は data.MIDDLE / SCHOOLS。高校候補は active で絞る|
|U12・U15・U18、推薦|youth.youthSelection / scouting.schoolScouting。年代・開催年・能力・実績で判定。U12/U15実績は高校推薦条件を補正|
|国内大学・海外大学・社会人・独立|安定ID university / overseas / corporate / independent。大学4年、再入学は禁止。社会人・独立は毎年再挑戦|
|ドラフト|draft.draft。能力、直近実績、注目度、甲子園実績、既存成長型、乱数。海外大学から海外プロ直行のオファーもある|
|国内プロ・海外プロ|stage pro / mlb。シーズン単位で進行。独立も engine.isPro に含む点に注意|
|一軍・二軍、メジャー・マイナー|roster.simulateDailyRoster → levels.simulateRegisteredLevels。record.stats は上位区分、levels.second は別記録。代表成績も別集計|
|FA・トレード・ポスティング|free-agency / market / lifecycle。登録日数、契約、複数球団提示、宣言残留、条件付き承認を実装。条件達成表示・移籍選択はUI|
|国際大会|national.prepareNational / decideNational。開催周期、成績、健康状態、辞退、調整不足、国際経験。名称は世界野球選手権・世界スポーツ大会|
|怪我|health.injury。日数消費、出場減、まれな能力低下と引退相談。国際大会の欠場効果は seasonImpact に別管理|
|位置・起用|内部IDは first/second/third/shortstop/left/center/right/catcher/dh、starter/reliever/setup/closer/bench/cleanup。控え・専門起用にもIDあり|
|タイトル・オールスター|awards.seasonAwards / allStarBallot。年間成績で閾値判定。球界全選手を生成して順位を争う仕組みではない。オールスターも年間終了時の実績で評価|
|年俸・複数年契約|contracts、finance。契約期間中の基本年俸、出来高、一軍登録日割りを分離。支配下420万円・育成240万円の既存設定を維持|
|引退・第二の人生|engine.retire / lifecycle.reviewEmployment / afterlife.startAfterlife。任意引退・引退勧告・就職打診・50歳上限。引退後の監督昇格も既存|
|殿堂・永久欠番|独立した殿堂入りの新規判定はない。現行は awards.legacyHonors の名球会入りと永久欠番。旧殿堂表記は互換データとして残る場合がある|
|careerId・姓名|identity.newCareerId / randomPlayerName。新規作成時だけID生成。姓名とIDの乱数はゲームSeedと分離|
|オートセーブ|autosave：localStorage の独立キー、version 1・checksum・payload。storage.validate で既存データ補完。ロード時にIDは生成しない|
|引退選手保存|career-library：別キー、version 1、完全スナップショット、初期3枠。破損・満枠・容量不足は上書き前に処理|
|共有|share：Canvas画像、Web Share / 保存・文章コピー。careerCardData は状態を変更しない。カードにIDは出していないが再生成もしていない|
|広告準備|ads：既定OFF、人生ごと1機会、タイムアウト・失敗時にも終了。実際の既存導線は引退後に「最終キャリアを見る」→広告処理→キャリア。引退確定ボタン直後の広告ではない。変更していない|

## 今回の最小変更

1. personality.migrateTraits：potential の一部キー欠落を決定的に補完。従来は空・部分オブジェクトが検証を通り、grow で NaN になり得た。存在する値・能力・ID・Seedは変更しない。
2. development.js：player.developmentTraits の専用領域と既存セーブへの補完。依頼された13特性の未定義値は null（未実装）で、現行の talent / potential / growthPhase / arc を置き換えない。
3. balance.js：DEV_MODE=false、従来と同値の成長・怪我設定、既定1の補正値。成長、怪我発生、成績生成の試合機会、年俸査定に小さな補正入口を設置。
4. developmentContext は年齢・年度・学年・進路・既存プロ年数・海外完了シーズン数を参照するだけ。seasonEnvironments[year].leagues を将来の年度別リーグ設定用に確保。まだ成績に適用しない。
5. developmentHistory に今後発生する既存の覚醒・伸び悩み・適応低下の種類、年・年齢・段階を記録。旧人生の不明な覚醒年は捏造しない。
6. dev-tools.js に読み取り専用の inspectDevelopmentState / developmentCheck。不正な年齢、年齢年度不一致、能力・成長上限、ID変更、学生年俸、引退後進行、リーグ区分混入を検出。プレイヤーUIには追加していない。
7. format.js に MONEY_UNIT='JPY_10000'、yenFromMan / manFromYen / formatYen。既存 money の表示を維持。

追加フィールドは既存保存形式の後方互換な省略可能項目。CONFIG.version、AUTOSAVE_VERSION、CAREER_LIBRARY_VERSION は既存の1を維持。読み込み時は既存の validate → migrateTraits 経由で補完し、未知の追加特性キーも保持する。将来、特性の単位や意味を変えるときは明示的なバージョン移行が別途必要。

## 成長・年齢・乱数

- 現役の age / year / grade 加算は nextYear に集約。転校・進学時は同関数で加算後 grade=1。プロ年数は finishYear のみで加算。afterlife の年齢・年度は第二の人生のローカル値。
- 開始年度2014、6歳。誕生日計算はなく、高3シーズンは17歳、卒業移行後18歳。この年度年齢定義は今回維持。
- 全段階で grow を共用。進路の growth / competition、才能・上限・スタイル・年齢・既存成長型・乱数を使用。プロ等の1年進行は2.4倍。
- peakAge は保存されるが、現行の年齢曲線は固定式で peakAge を読まない。growthFit も定義はあるが grow は呼んでいない。これらを有効化するとバランス変更になるので要別作業。
- 通常成長のほか、seasonEvent、国際交流、proAdaptation、重傷で能力が変わる。新しい成長型を入れる際は全入口の重複を検討する。
- random.js は状態内Seedを更新するLCG。between / integer / pick あり。createPlayer(name,role,seed) で再現できる。名前・ID・作成フォームのランダム選択だけ Math.random / crypto を使用。フォーム条件を固定して比較すること。
- 守備、送球成長、記録型抽選は専用の派生Seedを利用。抽選の呼び出し回数や順番を変えると既存人生が変わる。新ロジックは common random を使用し、必要なら用途別の別ストリームを設計する。

## 成績・出場機会・怪我

- 能力評価：growth.overall、stats.performance。
- 出場機会：engine.advance の能力帯・所属環境・契約確約・怪我、profile の役割、roster の日別登録と登板間隔。
- 成績生成：stats.simulateStats が役割別の打数／アウト数を作り、率の乱数と能力差から安打・本塁打・失点等を作る。
- 率と積み上げは同関数内だが式は区別できる。今回の statGameOpportunity は試合数の入口のみ。打席、先発数、セーブ機会の専用保存・個別補正は要追加。
- 高能力＝必ずフル出場ではない。日別の昇降格・起用・怪我が作用する。ただし健康時の高能力は高い登録比率になりやすい既存の能力帯モデル。
- 怪我は欠場と重傷時低下を反映するが、長期療養中の成長停止は実装されていない（grow が先に実行される）。国際大会の13%欠場判定は health と別であり、新しい耐性を適用する際に両方を検討する。
- 新成績分布への変更は simulateStats、simulateRegisteredLevels、simulateDailyRoster をセットで検証。二軍・マイナー・代表の成績を一軍評価へ足さない。

## 年俸・金額

- salaryEstimate は当年の機会数・performance（打撃、守備、走塁、投手詳細を含む）、救援実績、専門起用、経験年数、微小乱数を利用。
- 更改は前年年俸で平滑化し、宣言残留の信頼補正あり。市場オファーは market=true で前年年俸への平滑化を省く。
- タイトルそのものへの直接加点はない（好成績から間接反映）。年齢は提示年数・雇用継続等に使うが、salaryEstimate の金額に直接の年齢曲線はない。
- 新しい salaryAssessmentContext は直近同段階3シーズン、年齢、前年年俸、契約、市場フラグを提供する。今は参照窓口のみで新しい3年査定を実行しない。
- 既存金額は国内・海外とも万円。海外は既存モデルの倍率・上下限を用い、実行時にドル額から為替換算する仕組みではない。一軍日割りは円単位で丸めて万円へ戻す。
- 内部を円に全面変更すると年俸、オファー、契約、出来高、通算、旧保存、名鑑、画面とテスト全体に及ぶ。混在修正ではなく単位変更なので今回は保留。新規に円データを扱う境界は yenFromMan / manFromYen と formatYen を使用する。
- 既存設定の所在：SALARY_MODEL / SALARY_ANCHORS（contracts）、FIRST_TEAM_PAY（finance）、ROSTER_RULES（roster）、FA_RULES（free-agency）、CAREER_TYPES / GENIUS_RATE（archetypes）、RECORD_TALENT_RATE（records）、学校成長（data）。元からある設定を無理に移設していない。

## 履歴と残る注意点

- 進路・所属は teams、プロ入りは drafts / domesticEntry / proEntry、年齢は records、怪我は injuries、移籍は moves、FAは faDeclarations、昇降格は rosterHistory、受賞は awards / allStars / honors。新しい共通履歴へ二重に移し替えない。
- 旧 timeline は文章中心で、全イベントに age があるわけではない。旧年齢は年度基準から推定可能だが、古い覚醒・降格の詳細が欠けるものを確定情報にしない。
- 球団カタログにはIDがあるが、所属・履歴の多くは球団名をキーとしている。進路IDと違い完全なID参照ではない。改名互換は既存 migrateTeamNames が担当。
- proYears は独立リーグも含む。国内プロ年数、海外登録年数、通算実働年数は同義ではない。海外在籍シーズンと mlbService の登録換算年も区別する。
- 年度履歴、periodResults、rosterHistory などに日別記録が重複保存される。大容量名鑑・1万人生の全状態保持は容量・メモリ測定が必要。保存失敗時に古いデータを消さない実装は維持。
- UI は大きな単一モジュール、ESモジュールには循環参照、単体版は明示的ファイル順の結合。大規模な依存変更は慎重に。未使用の旧画面関数や古い説明文も残るが削除していない。

## 開発・ヘッドレス検証

エンジンにDOM依存はなく、既にUIなしで実行可能。tests/audit-scenarios.mjs の auditCareer(seed, role, route, observe) はテスト専用の選択方針で1人生を終了まで進める。500ステップで停滞を検出する。実在しないオファーや能力を生成せず、進路にオファーがなければ既存の代替進路を選ぶ。本番オートプレイは追加していない。

DEV_MODE は balance.js で既定false。Nodeから dev-tools.js の developmentCheck を呼ぶとON時だけ診断し、inspectDevelopmentState はテスト用に常時直接利用可能。診断は状態・Seed・保存を変更せずエラー一覧を返す。自動でプレイヤーUIへエラーを出さない。大量集計CLI、統計レポート、成長理由・年俸査定の詳細ログは今後の追加対象。

tests/audit-baseline.json は修正前に採取した30条件（3 Seed × 投手野手 × 5進路希望）の最終状態SHA-256。比較から除外するのはランダムなcareerIdと今回の追加領域だけ。既存の全成績・年俸・能力・履歴・Seed・引退後人生を照合する。基盤整理のためにこの期待値を再生成してはならない。将来意図的にバランスを変える際は、旧値との差を評価してから更新する。

確認コマンド：

```powershell
node build-single-file.mjs
npm test
```

監査時点の自動テストは178件通過。新規開始、小中高、全進路、ドラフト、国内外プロ、移籍、引退、旧形式補完、オートセーブ、名鑑、共有、広告エラー時の進行を含む。30条件は変更前の既存状態と一致。ブラウザ実機のPC・スマホ目視確認は今回未実施。描画・ボタン遷移は既存VMテストで確認し、HTML/CSS/UIソースは変更していない。

## 次の実装

段階的な追加へ進んでよい。多様性は development / archetypes / personality / growth / health、進路相性は data / engine.environment、成績は stats / levels / roster / fielding、年俸は contracts / finance / market / lifecycle が主な対象。新特性を有効化すると既存成長型との二重補正になるため、意味と優先順位を決めてから1系統ずつ実装する。
オンラインランキング、DB、広告SDK、決済、新しい選手タイプ・成績分布・年俸バランスは今回追加していない。
