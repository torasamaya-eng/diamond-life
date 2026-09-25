# 最終キャリアの広告枠（未配信）

唯一の呼出箇所は、引退後の「最終キャリアを見る」です。
SDKの読込み、Publisher ID、広告ID、広告通信は追加していません。
現在 FINAL_CAREER_AD_CONFIG.enabled は false で、押すとそのまま最終キャリアへ進みます。
通常のキャリアタブ、成績閲覧、シェア、ゲーム進行では広告を呼びません。

## 分離した処理

- dist/src/ads.js：表示機会の予約、アダプター、完了通知、タイムアウト
- UI：ボタンから呼出し、結果に関係なく最終キャリアに遷移
- state.finalCareerAd：同一人生での再試行禁止を保存
- localStorage の diamond-life.final-career-ad.<careerId>：再読込時の重複防止

保存できない環境では広告をスキップします。無効・広告なしの場合も機会を消費します。
ゲーム保存とは別の予約キーを先に書き込み、オートセーブ失敗後の再試行も防ぎます。
サイトデータを利用者が消去した場合はローカル記録も消えます。

## 将来接続するとき

実際の契約情報・地域別同意・公開ポリシーの更新を済ませたうえで、
初期化完了したSDKを createH5CareerAdapter に渡し、
setFinalCareerAdAdapter で登録してから enabled を有効化してください。
isReady は同意・SDK初期化の両方が完了した時だけ true にします。
未初期化の adsbygoogle キューへ要求を蓄積するスタブは接続しないでください。

H5の browse 枠と afterAd / adBreakDone を使用します。
name: final-career は内部の配置名であり、Googleの発行する広告IDではありません。
https://developers.google.com/ad-placement/apis/adbreak

例外、在庫なし、notReady、通信・ブロック等による無応答は同じ完了経路へ進みます。
通常8秒、設定しても最大15秒で待機終了。終了後の通知は無視します。
将来の実広告接続時は、アダプターの cancel で遅延要求・広告UIを解除できるかも検証してください。
Google SDK自体のキャンセル機能を本準備コードが保証するものではありません。
