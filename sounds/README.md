# sounds/

警報音の音声ファイルを置くフォルダです。
**音声ファイルはこのリポジトリ（ソース）には含めていません。** 使う場合は出典元から各自で入手して配置してください。

## 出典

ゲームの警報音は試作音（synth.js の試作A）で固定しており、音声ファイルは使いません。
警報音ラボ（sound-lab.html）で本物と聞き比べる場合だけ、上越市が公開している次の音声を参照します。

- 出典元：上越市「デジタル防災行政無線（同報系）システム」
  https://www.city.joetsu.niigata.jp/soshiki/kikikanri/dentatsu.html

| 配置するファイル名 | 内容 | 出典元の音声ファイル |
|---|---|---|
| `eew.mp3` | 緊急地震速報 | [緊急地震速報（mp3）](https://www.city.joetsu.niigata.jp/uploaded/attachment/60628.mp3) |
| `missile.mp3` | 国民保護情報（ミサイル発射情報） | [国民保護情報（mp3）](https://www.city.joetsu.niigata.jp/uploaded/attachment/60632.mp3) |

音声の権利は出典元に帰属します。本リポジトリの MIT License の対象外です。
利用する場合は、出典元の利用条件を確認し、必要に応じて許可を得てください。

## 配置のしかた

```sh
cd sounds
curl -L -o eew.mp3     https://www.city.joetsu.niigata.jp/uploaded/attachment/60628.mp3
curl -L -o missile.mp3 https://www.city.joetsu.niigata.jp/uploaded/attachment/60632.mp3
```

- mp3 / m4a / wav / ogg のどれでも読み込みます。
- ファイルが無くても、ゲームは試作Aで動きます。
