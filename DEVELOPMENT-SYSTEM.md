# 選手多様性・進路別成長

## 既存モデルとの関係

共有のgrowだけを使用。talentは基礎成長に一度だけ使用し、potentialは既存能力別上限。growthPhaseは若年・成人の伸び方、arcは既存のキャリア傾向、peakAgeは個人の時間軸を担う。天才は既存GENIUS_RATE=1/30の一回抽選を維持。新しい能力上限・天才・才能パラメータは作らない。

新規選手のpeakAgeだけを既存phaseに応じて調整する。既存保存のpeakAge・talent・potential・arc・能力は補完時に変更しない。年齢曲線は12歳・18歳・ピーク付近で連続。ピーク後はdeclineRate、longevity、既存能力の種類によって維持・衰えが異なる。新しい固定失敗タイプはない。

developmentTraitsにはdeclineRate、injuryResistance、adaptability、consistency、hiddenBreakout、stagnationRisk、longevity、pressureResistanceを保存。phaseとlongevity、adaptabilityとconsistencyなどは弱く相関し、同傾向でも個体差がある。clutchは既存abilities.clutchを維持し、今回別の能力や通常成績補正は追加しない。

## 進路・出場・適応

university: 未完成な上限余地、晩成、実戦経験、適応を併用。
overseas: 同条件でも適応差が国内より大きい。既存の海外ドラフトを維持。
corporate: consistencyと技術系能力を軽く優遇。
independent: 実戦機会と未完成度を反映し、良好な実績とhiddenBreakoutが揃うと覚醒しやすい。独立所属だけで覚醒しない。
pro: 高卒初期の完成度、出場・二軍経験、上位指名や新人の重圧を反映。
mlb: 適応の影響をやや強くし、マイナー経験も実戦機会として扱う。

成長時に進路・所属の変更を確認する。一軍／二軍、メジャー／マイナーの年度登録多数側が変わった場合も適応期間を記録し、次の成長に反映する。日々の登録抹消ごとの適応抽選は増設しない。役割IDの変更は既存起用を使い、停滞回復の契機とする。新しいコンバートエンジンはない。

## 覚醒・停滞・怪我

既存seasonEventとarcEventを使い、覚醒履歴の回数上限・間隔を共用。新しい覚醒は得意分野を中心に最大2能力と短い成長期間へ反映する。停滞は成長効率の一時低下であり、期間経過、環境変更、役割変更で回復可能。既存proAdaptationの一度限りの壁は適応力で強度を調整し、旧brief/lostStarの継続的な負成長を時限的な停滞へ変更。

health.injuryの発生率フックに怪我耐性を適用。国際大会の別の怪我抽選にも一度だけ適用し、欠場量や成長抑制には再適用しない。継続療養中はgrowで欠場期間に応じて抑制。成長後に発生した怪我はその期の正の成長差分だけを縮め、乱数処理の順序を維持する。重傷の既存能力低下は残す。短期の怪我は大きな成長阻害にしない。

戦力外の再雇用処理では、国内・海外プロ未経験の独立選手を無条件の国内育成契約でプロへ迂回させない。初めてのプロ契約は従来のドラフト評価を使う。提示額の計算は維持。追加のバランス調整では、プロで3季続けて出場・実績が不足した場合に再雇用・育成契約が無制限に続かないよう、契約需要を確認する。

## 保存と乱数

追加抽選は既存randomを派生Seed状態で使い、ゲーム本体のSeedを追加抽選のために消費しない。originSeedと短期的な適応・停滞状態はdevelopmentStateに保存。特性生成の起点は既存Seed、arc、phase、役割、能力から決定的に作る。

欠けた特性だけを補完し、オートセーブと保存済み引退選手へ書き戻す。既存careerId・記録・過去の履歴を推測で書き換えない。不正な特性値は既存読み込みエラーハンドリングで扱う。同Seed・同操作は新バージョン内で再現可能。旧バージョンの将来の進行結果との完全一致は成長変更のため保証しない。

developmentHistory: BREAKOUT、STAGNATION、STAGNATION_END、ADAPTATION_SUCCESS、ADAPTATION_FAILURE、DECLINE_START。引退時のcareerTypesは実際の成績・経路・受賞・怪我から導出する内部情報で、UIは追加しない。

## 変更箇所

- dist/src: balance.js、development.js、growth.js、personality.js、archetypes.js、events.js、engine.js、national.js、lifecycle.js、autosave.js、career-library.js、dev-tools.js、career-types.js（新規）
- tests: audit-scenarios.mjs、foundation-audit.test.js、v15.test.js、simulation.test.js、development-diversity.test.js（新規）、development-study.mjs（新規）、development-report.mjs（新規）
- build-single-file.mjs、生成物DIAMOND-LIFE.html、本書、reports/development-*。

health.jsの既存フックを再利用し、成績計算・年俸・ドラフト・UI・広告の本体は変更していない。既存テストのうち、旧ハッシュ完全一致はbaseline不変性と新旧差分確認に変更し、適応低下量と時限停滞の期待値を新設定に合わせた。全進路テストは独立で戦力外になった場合の既存社会人再挑戦も通すようにし、引退までの検査は維持。

## 実行

```text
node tests/development-study.mjs after 1000
node tests/development-study.mjs diversity 1000
node tests/development-report.mjs
node build-single-file.mjs
npm test
```

係数はbalance.jsへ集約。初回の旧実行reports/development-before.jsonとtests/audit-baseline.jsonは修正前の基準として保持し、テストを通す目的で再生成しない。比較結果と母集団・操作方針の限界はreports/development-comparison.mdを参照。

## 希少性調整の追補

今回の調整ではbalance.jsのCAREER_BALANCEと既存STAGNATIONを使用。才能の生成は変更せず、停滞リスク・適応力・重圧耐性の複合条件により期間・回復を変える。天才フラグによる減点はない。growのピーク後処理には健康・長寿特性・重傷歴を反映。

engine.js・roster.jsの海外トップ選考はdevelopment.majorReadyを共用する。直近の国内・マイナー実績、年齢、能力、適応を反映し、海外球団への所属とメジャーへの出場を分ける。既存の出場保証・降格拒否権は維持。awards.jsの永久欠番は長期在籍・球団実績・複数タイトル・大きな栄誉を複合判定する。名球会の記録条件と保存済み栄誉は維持。

今回の報告はreports/balance-tuning-result.md。変更前の保存状態はbalance-tuning-before.json、同じコード・操作で再集計した変更前データはbalance-tuning-before-distinct.json／balance-tuning-before-paired.json。変更後はbalance-tuning-after-distinct.json／balance-tuning-after-paired.json。既存のdevelopment-comparison.mdは前回工程の記録として保持する。

検証は既存191テストと追加balance-tuning.test.jsの7テスト。再集計後はnode tests/balance-report.mjsで今回の比較報告を生成できる。
