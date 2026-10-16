// 緊急速報シミュレーター WebSocket サーバ
// - ラウンド（場所・警報の種類・発報時刻）はサーバが決めて全員に配信
// - 各プレイヤーの位置を集めて 10Hz で全員に配信
// 判定（DEAD / ALIVE）は各クライアントが同じルールで計算する
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.ALERT_WS_PORT || '8766', 10);
const HOST = process.env.ALERT_WS_HOST || '127.0.0.1';

const SCENES = ['home', 'school', 'town', 'station', 'super', 'office', 'bedroom',
  'hospital', 'theater', 'gym', 'konbini', 'beach', 'mansion', 'library', 'restaurant', 'warehouse', 'shrine',
  'townNight', 'konbiniNight', 'hospitalNight',
  'train', 'trainNight', 'airport', 'park', 'hotelNight', 'stadium', 'sento',
  'mall', 'ugParking', 'subway', 'port', 'amusement', 'camp', 'museum', 'livehouse', 'nursery', 'arcade',
  'stationFront', 'hillside', 'riverside', 'farmland', 'shoppingSt', 'officeDist', 'hospitalFront', 'industrial'];
// 地震は震度ごとに猶予（秒）と揺れの長さを変える。震度7は直下型で猶予が短い
const SHINDO = [
  { s: '5強', w: 0.2,  limit: 11,  post: 4 },
  { s: '6弱', w: 0.3,  limit: 10,  post: 4.6 },
  { s: '6強', w: 0.25, limit: 9,   post: 5.2 },
  { s: '7',   w: 0.25, limit: 7,   post: 6 },
];
const MS = { limit: 14, post: 2.4 };
const RESULT_MS = 9000;                // 結果表示（ミリ秒）
const MAX_CLIENTS = 200;
const MAX_MSG_PER_SEC = 40;

const wss = new WebSocketServer({ host: HOST, port: PORT, maxPayload: 1024 });
const clients = new Map(); // ws -> player

// ====== ランキング（data/ranking.json に保存） ======
const DATA = path.join(__dirname, 'data', 'ranking.json');
let rank = {}; // token -> {name, score, alive, rounds, streak, best, last}
try { rank = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch (_) {}
let dirty = false;
setInterval(() => {
  if (!dirty) return; dirty = false;
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  const tmp = DATA + '.tmp';
  fs.writeFile(tmp, JSON.stringify(rank), (e) => { if (!e) fs.rename(tmp, DATA, () => {}); });
}, 10000);
function sorted(){
  return Object.entries(rank).sort((a, b) => b[1].score - a[1].score || b[1].alive - a[1].alive);
}
function rankRow(t, e, i){ return { n: i + 1, name: e.name, score: e.score, alive: e.alive, rounds: e.rounds, best: e.best }; }
// ALIVE ランキング：生存回数 → 生存率 → スコア
function sortedAlive(){
  const rate = e => e.rounds ? e.alive / e.rounds : 0;
  return Object.entries(rank).sort((a, b) => b[1].alive - a[1].alive || rate(b[1]) - rate(a[1]) || b[1].score - a[1].score);
}
function sendRanking(target){
  const list = sorted(), listA = sortedAlive();
  const top = list.slice(0, 20).map(([t, e], i) => rankRow(t, e, i));
  const alive = listA.slice(0, 20).map(([t, e], i) => rankRow(t, e, i));
  const idx = new Map(list.map(([t], i) => [t, i])), idxA = new Map(listA.map(([t], i) => [t, i]));
  for (const [ws, p] of clients){
    if (target && ws !== target) continue;
    const i = p.token ? idx.get(p.token) : undefined, j = p.token ? idxA.get(p.token) : undefined;
    send(ws, { t: 'rank', top, alive, total: list.length,
      me: i === undefined ? null : rankRow(p.token, list[i][1], i),
      meA: j === undefined ? null : rankRow(p.token, listA[j][1], j) });
  }
}
let round = null, roundId = 0, lastScene = null, cycle = -1, nextPid = 1;

function send(ws, obj){ if (ws.readyState === ws.OPEN) try { ws.send(JSON.stringify(obj)); } catch (_) {} }
function broadcast(obj){ const s = JSON.stringify(obj); for (const ws of clients.keys()) if (ws.readyState === ws.OPEN) try { ws.send(s); } catch (_) {} }

function newRound(now){
  let scene;
  do { scene = SCENES[Math.random() * SCENES.length | 0]; } while (scene === lastScene);
  lastScene = scene;
  // 地震とミサイルは交互
  // 地震2回 → ミサイル1回 の順
  cycle = (cycle + 1) % 3;
  const type = ['eq', 'eq', 'ms'][cycle];
  let sh = null, limit = MS.limit, post = MS.post;
  if (type === 'eq'){
    let x = Math.random();
    sh = SHINDO.find(q => (x -= q.w) < 0) || SHINDO[SHINDO.length - 1];
    limit = sh.limit; post = sh.post;
  }
  const start = now + 300;
  const alert = Math.round(start + 4000 + Math.random() * 4000);
  const end = Math.round(alert + (limit + post) * 1000);
  // seed：家具の固定・崩落場所・運など、全員共通の偶然要素
  round = { id: ++roundId, scene, type, shindo: sh ? sh.s : null, start, alert, limit, post, end, next: end + RESULT_MS, seed: Math.random() * 2147483647 | 0 };
  setTimeout(() => sendRanking(), end - Date.now() + 4000);
  broadcast({ t: 'round', now: Date.now(), r: round });
}

setInterval(() => {
  const now = Date.now();
  let joined = 0; for (const p of clients.values()) if (p.joined) joined++;
  if (joined === 0){ round = null; return; }
  if (!round || now >= round.next) newRound(now);
  const ps = [];
  for (const p of clients.values()){
    if (p.r === round.id && p.x != null) ps.push([p.id, p.name, p.x, p.y, p.c, p.f, p.hue, p.a, p.tr, p.k, p.j, p.d]);
  }
  broadcast({ t: 's', now, n: joined, ps });
}, 100);

// 死んだ接続の掃除
setInterval(() => {
  for (const ws of clients.keys()){
    if (ws._alive === false){ ws.terminate(); continue; }
    ws._alive = false; try { ws.ping(); } catch (_) {}
  }
}, 30000);

wss.on('connection', (ws) => {
  if (clients.size >= MAX_CLIENTS){ ws.close(1013, 'full'); return; }
  const p = { id: nextPid++, name: '名無し', x: null, y: null, c: 0, f: 1, r: 0, a: '', tr: 0, hue: Math.random() * 360 | 0, cnt: 0, win: Date.now() };
  clients.set(ws, p);
  ws._alive = true;
  ws.on('pong', () => { ws._alive = true; });

  ws.on('message', (data) => {
    const now = Date.now();
    if (now - p.win > 1000){ p.win = now; p.cnt = 0; }
    if (++p.cnt > MAX_MSG_PER_SEC) return;
    let m; try { m = JSON.parse(data); } catch (_) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello'){
      p.name = String(m.name || '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').trim().slice(0, 12) || '名無し';
      p.joined = true;
      if (/^[a-f0-9]{16,40}$/.test(m.token)) p.token = m.token;
      if (p.token && rank[p.token] && rank[p.token].name !== p.name){ rank[p.token].name = p.name; dirty = true; }
      setTimeout(() => sendRanking(ws), 200);
      send(ws, { t: 'welcome', now, id: p.id });
      if (!round) newRound(now); else send(ws, { t: 'round', now, r: round });
    } else if (m.t === 'res'){
      // このラウンドに参加していた人の結果を1回だけ受け付ける
      if (!p.joined || !p.token || !round || m.r !== round.id || p.r !== round.id || p.done === round.id) return;
      if (now < round.end - 1000 || now > round.next) return;
      const score = Math.max(0, Math.min(600, Math.round(Number(m.score) || 0)));
      p.done = round.id;
      const e = rank[p.token] || (rank[p.token] = { name: p.name, score: 0, alive: 0, rounds: 0, streak: 0, best: 0 });
      e.name = p.name; e.rounds++; e.last = now;
      if (m.alive){ e.alive++; e.streak++; e.best = Math.max(e.best, e.streak); e.score += score; } else e.streak = 0;
      dirty = true;
    } else if (m.t === 'idle'){
      // 無操作で一時停止：プレイヤーとして数えない（再開時は hello し直す）
      p.joined = false; p.r = 0;
    } else if (m.t === 'chat'){
      // チャット：参加者のみ、0.8秒に1回まで、60文字まで
      if (!p.joined || now - (p.lastChat || 0) < 800) return;
      const text = String(m.text || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60);
      if (!text) return;
      p.lastChat = now;
      const out = JSON.stringify({ t: 'chat', id: p.id, name: p.name, text, hue: p.hue });
      for (const [w, q] of clients) if (q.joined && w.readyState === w.OPEN) try { w.send(out); } catch (_) {}
    } else if (m.t === 'rankreq'){
      if (!p.token && /^[a-f0-9]{16,40}$/.test(m.token)) p.token = m.token;
      sendRanking(ws);
    } else if (m.t === 'p'){
      const x = Number(m.x), y = Number(m.y), r = Number(m.r);
      if (!isFinite(x) || !isFinite(y) || x < 0 || y < 0 || x > 20 || y > 13 || !Number.isInteger(r)) return;
      p.x = Math.round(x * 100) / 100; p.y = Math.round(y * 100) / 100;
      p.c = m.c ? 1 : 0; p.f = m.f < 0 ? -1 : 1; p.r = r;
      p.a = /^[A-Za-z0-9]{1,16}$/.test(m.a) ? m.a : '';
      p.tr = m.tr === 1 || m.tr === 2 ? m.tr : 0;
      p.k = m.k ? 1 : 0;
      p.j = m.j ? 1 : 0; p.d = m.d ? 1 : 0;   // ジャンプ中・ダッシュ中
    }
  });
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => {});
});

console.log(`alert-ws listening on ${HOST}:${PORT}`);
