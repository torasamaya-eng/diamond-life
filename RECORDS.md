# 記録挑戦型・途中出場の起用

記録挑戦型は既存の天才抽選と別に 1/30 で抽選。内訳は複数記録型 35%、一分野特化型 65%。
抽選結果は記録更新を保証せず、成長、能力、出場機会、故障、起用の影響を受ける。
既存選手へ再抽選は行わない。特化分野は野手が安打・本塁打・盗塁、投手が奪三振・セーブ。
複数記録型の投手は先発・抑えなどキャリア中の起用変更によって異なる記録に挑める。
学生・二軍・マイナー・代表戦に記録用の成績補正は適用しない。

## ゲーム内シーズン記録

設定は dist/src/records.js の RECORD_TARGETS。
日本記録は国内一軍のみ、世界記録は国内一軍または海外メジャーの単一シーズンが対象。
複数リーグや複数年度を合算した記録ではない。
世界中の全野球リーグを網羅する公認世界記録ではなく、NPB・主要リーグの歴史的記録を参考にしたゲーム内基準。
新記録は基準値を厳密に超えた場合のみ。自己更新後はその数字が次の基準になり、同じ成績の再判定で二重授与しない。
更新は recordHistory と honors、キャリア年表に年度・年齢・球団・旧記録・新記録を保持。

| 記録 | 日本基準 | 世界基準 |
| --- | ---: | ---: |
| 安打 | 216 | 262 |
| 本塁打 | 60 | 73 |
| 盗塁 | 130 | 138 |
| 奪三振 | 401 | 513 |
| セーブ | 54 | 62 |

参考：
- https://npb.jp/bis/history/ssb_h.html
- https://npb.jp/bis/history/ssb_hr.html
- https://npb.jp/bis/history/ssb_sb.html
- https://npb.jp/bis/history/ssp_so.html
- https://npb.jp/bis/history/ssp_sv.html
- https://www.mlb.com/news/ichiro-in-lineup-for-opening-series-finale/
- https://www.mlb.com/player/barry-bonds-111188
- https://www.mlb.com/press-release/edwin-diaz-named-mariano-rivera-american-league-reliever-of-the-year-299824200

## 代打

成年期の打撃特化選手や守備・走力が衰えたベテランを毎季評価。
強打・勝負強さの両方が十分な選手は「代打の切り札」。
DHで通常出場できる若手、レギュラー確約、育成契約は別に判定する。
代打は1試合約1打数。守備と盗塁機会も少なくし、実績に基づく専門査定を行う。
200打数未満の専門要員の国内評価額は最大6000万円。既存年俸との継続性調整や複数年契約の保証は維持。
守備・走力・打撃が伸びればレギュラーに再評価できる。
