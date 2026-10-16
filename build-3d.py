#!/usr/bin/env python3
# 3D 版（3d/index.html）を 2D 版（index.html）から組み立てる。
# ゲームの中身は 2D 版と共通で、描画だけ build3d/*.js（three.js）に差し替える。
# 2D 版を直したら：python3 build-3d.py
import re, os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
s = open('index.html', encoding='utf-8').read()
r3 = open('build3d/r3d.js', encoding='utf-8').read()
tr = open('build3d/transit3d.js', encoding='utf-8').read()

def rep(a, b, cnt=1):
    global s
    n = s.count(a)
    if n != cnt: sys.exit(f'置換できません({n}): {a[:60]}')
    s = s.replace(a, b)

def scoped(start, end):
    global s
    i = s.index(start); j = s.index(end, i)
    s = s[:i] + s[i:j].replace('COLS*T', 'SW').replace('ROWS*T', 'SH') + s[j:]

rep("<title>緊急速報シミュレーター｜生存か死亡か オンライン避難ゲーム</title>",
    "<title>緊急速報シミュレーター 3D｜生存か死亡か オンライン避難ゲーム</title>")
rep('<meta property="og:url" content="https://alert.satoru.net/">', '<meta property="og:url" content="https://alert.satoru.net/3d/">')
rep("#cv{width:100%;height:100%;display:block;touch-action:none}",
    "#cv,#gl{position:absolute;inset:0;width:100%!important;height:100%!important;display:block;touch-action:none}\n#gl{z-index:0}\n#cv{z-index:1}\n"
    "/* 3D 版：ゲーム画面を大きく（比率を固定せず、空いている場所いっぱいに） */\n#app{max-width:1600px!important}\n#stage{width:100%!important;height:100%!important;aspect-ratio:auto!important}")
rep("const cv = $('cv'), ctx = cv.getContext('2d');", "const cv = $('cv'); let ctx = cv.getContext('2d');")
rep("const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + location.pathname.replace(/[^/]*$/, '') + 'ws';",
    "const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';   // 2D 版と同じサーバ")
rep("  update(dt);\n  draw(t);", "  update(dt);\n  draw3D(t, dt);")
rep("""  const r = cv.getBoundingClientRect();
  const tx = Math.floor((e.clientX - r.left) / r.width * COLS);
  const ty = Math.floor((e.clientY - r.top) / r.height * ROWS);""",
    """  const hit = tapToTile(e); if (!hit) return;
  const tx = hit.tx, ty = hit.ty;""")
rep('<a id="dimBtn" href="3d/" title="3D版に切り替え">3D</a>', '<a id="dimBtn" href="../" title="2D版に切り替え">2D</a>')
rep("// ====== ループ ======", r3 + "\n" + tr + "\n// ====== ループ ======")
s = re.sub(r'<script src="synth\.js\?v=([0-9a-f]*)"></script>',
           r'<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script src="../synth.js?v=\1"></script>', s)
# 画面座標を使う関数は、重ね表示の論理サイズ（SW×SH）で描く
for a, b in [("function proj(x, h, z){", "\n}\n"), ("function draw3D(now, dt){", "// ====== 移動中の専用シーン"),
             ("function drawTransit3D(now, dt){", "\n}\n"), ("function portalSigns3D(A){", "// 画面タップで移動"),
             ("function drawVerdict(){", "\n}\n"), ("function drawLocation(){", "\n}\n"),
             ("function drawTitleBg(now){", "\n}\n"), ("function bubble(X, Y, text){", "\n}\n")]:
    scoped(a, b)
open('3d/index.html', 'w', encoding='utf-8').write(s)
print('3d/index.html を作りました', len(s), 'bytes')
