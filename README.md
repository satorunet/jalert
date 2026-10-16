# 緊急速報シミュレーター（jalert）

突然鳴り響く **緊急地震速報**・**ミサイル発射情報**。みんなで同時に避難して、生き残れるか？
ラウンドごとに「生存」か「死亡」かが判定される、オンラインの防災トレーニングゲームです。

▶ プレイ: https://alert.satoru.net

![og](og.png)

> ⚠️ これは訓練用のゲームです。画面の速報・警報はすべて訓練で、本物の緊急地震速報・Jアラートではありません。

## 特徴

- サーバーがラウンド（場所・警報の種類・震度・発報時刻）を決め、参加者全員が同時に避難
- 地震2回 → ミサイル1回の順。地震は震度5強〜7（震度が大きいほど猶予が短く、判定が厳しい）
- 37か所のシーン（自宅・学校・駅・電車の中・病院・スーパー・港・キャンプ場・ライブハウス…）
- 建物の出入り・階段・エレベーター（揺れの最中に乗っていると死亡）、地下、津波避難ビル
- 家具の転倒・ガラス・ブロック塀・落下物・津波・土砂崩れ・人込みの圧死など、死因つきの判定
- 場所に合ったNPC（最大70人）が会話し、警報時は冷静に避難／パニック／固まる
- 偶然要素（固定された家具、崩落場所、運）はラウンドごとの seed で全員共通
- チャット（定型文あり）、生存ランキング、スマホ向けのスティック＋4ボタン操作

## 構成

```
index.html        ゲーム本体（HTML/CSS/JS）
synth.js          警報音の試作（ブラウザ内合成）
sound-lab.html    警報音ラボ（本物と試作音の聞き比べ）
bust.sh           キャッシュバスター（音声・synth.js を差し替えたら実行）
og.png            OGP画像
server/server.js  ラウンド配信・位置共有・ランキングの WebSocket サーバ（Node.js + ws）
sounds/           警報音を置く場所（同梱なし。sounds/README.md）
```

## 動かし方

### サーバ

```sh
cd server
npm install
ALERT_WS_HOST=127.0.0.1 ALERT_WS_PORT=8766 node server.js
```

ランキングは `server/data/ranking.json` に保存されます。

### Web サーバ（nginx の例）

`index.html` と同じ場所の `/ws` を WebSocket サーバへ中継します。

```nginx
server {
    server_name alert.example.com;
    root /path/to/jalert;
    location = /ws {
        proxy_pass http://127.0.0.1:8766/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }
    location ^~ /server/ { return 404; }
}
```

サーバに接続できない場合は、ブラウザ内だけで同じルールのラウンドが続きます（オフライン）。

## 警報音について（出典）

警報音の音声ファイルは **このリポジトリには含めていません**。
alert.satoru.net の「実際の音」では、上越市が公開している音声を使用しています。

- 出典：上越市「[デジタル防災行政無線（同報系）システム](https://www.city.joetsu.niigata.jp/soshiki/kikikanri/dentatsu.html)」
  - [緊急地震速報（mp3）](https://www.city.joetsu.niigata.jp/uploaded/attachment/60628.mp3) → `sounds/eew.mp3`
  - [国民保護情報（mp3）](https://www.city.joetsu.niigata.jp/uploaded/attachment/60632.mp3) → `sounds/missile.mp3`

音声の権利は出典元に帰属し、MIT License の対象外です。配置方法は [sounds/README.md](sounds/README.md) を参照してください。

### 試作音（synth.js）

実際の警報音に**似せた別の音**を、録音を使わずブラウザで合成しています（MIT）。
標準では **地震・ミサイルとも試作A** です。☰ メニュー「地震の警報音」「ミサイルの警報音」で切り替えられます（音声ファイルが無い場合は試作Aになります）。
`sound-lab.html` で本物と聞き比べられます（▶ https://alert.satoru.net/sound-lab.html ）。

| | 試作A | 試作B | 試作C |
|---|---|---|---|
| 緊急地震速報 | 本物に近いチャイム（長さ・リズム・音域・音色・和音の形を合わせ、音高は別） | 上昇アルペジオ | 携帯の緊急速報風 |

地震には **試作D（和音型）** もあります（試作Aと同じ響きの和音を、上に鳴らして下へ返す形）。
| ミサイル | 本物に近いサイレン（実際の音を分析して合わせた2音のうなり） | モーターサイレン | 高低交互サイレン |

## ライセンス

[MIT License](LICENSE) © 2026 satoru.net（警報音の音声ファイルは対象外・同梱なし）
