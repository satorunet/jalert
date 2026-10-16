#!/bin/sh
# キャッシュバスター：音声ファイルと synth.js の中身のハッシュを URL の ?v= に書き込む
# 音や synth.js を差し替えたら実行する（sh bust.sh）
cd "$(dirname "$0")"
h(){ [ -f "$1" ] && sha1sum "$1" | cut -c1-10 || echo ""; }
SYN=$(h synth.js); EEW=$(h sounds/eew.mp3); MS=$(h sounds/missile.mp3)
sed -i -E "s#synth\.js(\?v=[0-9a-f]*)?\"#synth.js?v=$SYN\"#" index.html sound-lab.html 3d/index.html
sed -i -E "s#const SOUND_V = \{eq:'[0-9a-f]*', ms:'[0-9a-f]*'\}#const SOUND_V = {eq:'$EEW', ms:'$MS'}#" index.html
sed -i -E "s#sounds/eew\.mp3\?v=[0-9a-f]*'#sounds/eew.mp3?v=$EEW'#; s#sounds/missile\.mp3\?v=[0-9a-f]*'#sounds/missile.mp3?v=$MS'#" sound-lab.html
echo "synth.js=$SYN eew.mp3=$EEW missile.mp3=$MS"
