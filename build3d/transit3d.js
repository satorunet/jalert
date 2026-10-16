// ====== 移動中の専用シーン（階段の吹き抜け・エレベーターのかご） ======
const TR3 = {stairs:null, elev:null, path:null, len:0};
function floorOf(key){
  const A = AREAS[key]; if (!A) return 1;
  if (A.underground) return -1;
  const m = /(\d+)階/.exec(areaName(key)); return m ? +m[1] : 1;
}
const floorLabel = f => f < 0 ? 'B' + (-f) : f + 'F';
function buildStairs(){
  const g = new THREE.Group(); g.visible = false; R3.scene.add(g);
  const stepM = m3(0x9e9e9e), railM = m3(0xfdd835), wallM = m3(0xcfd2d6), landM = m3(0xb0b4b9);
  const pts = [];
  const RUN = .3, RISE = .18, N = 8, LANE = 1.3, FL = 16;
  for (let i = 0; i < FL; i++){
    const dir = i % 2 ? -1 : 1, z = i % 2 ? LANE : 0, y0 = -i*N*RISE;
    const x0 = dir > 0 ? 0 : N*RUN, x1 = dir > 0 ? N*RUN : 0;
    for (let s = 0; s < N; s++){
      const st = bx(RUN, .12, 1.1, stepM); st.position.set(x0 + dir*(s + .5)*RUN, y0 - (s + 1)*RISE + .06, z); g.add(st);
    }
    const land = bx(1.2, .12, LANE + 1.1, landM); land.position.set(x1 + dir*.6, y0 - N*RISE + .06, LANE/2); g.add(land);
    const rail = bx(N*RUN, .05, .05, railM); rail.position.set((x0 + x1)/2, y0 - N*RISE/2 + .9, z + (i % 2 ? .55 : -.55)); rail.rotation.z = -dir*Math.atan2(N*RISE, N*RUN); g.add(rail);
    pts.push(new THREE.Vector3(x0 - dir*.3, y0, z), new THREE.Vector3(x1, y0 - N*RISE, z), new THREE.Vector3(x1 + dir*.6, y0 - N*RISE, z), new THREE.Vector3(x1 + dir*.6, y0 - N*RISE, i % 2 ? 0 : LANE));
  }
  const back = bx(N*RUN + 3.4, FL*N*RISE + 4, .1, wallM); back.position.set(N*RUN/2, -FL*N*RISE/2 + 1, -.8); g.add(back);
  for (let i = 0; i < FL; i += 2){ const sg = bx(.5, .3, .04, m3(0x2e7d32, {emissive:0x1b5e20, emissiveIntensity:.6})); sg.position.set(N*RUN/2, -i*N*RISE + 1.4, -.74); g.add(sg); }
  const lamp = new THREE.PointLight(0xffffff, .9, 8); g.add(lamp); g.userData.lamp = lamp;
  TR3.stairs = g;
  TR3.path = pts;
  let L = 0; TR3.flightEnd = [];
  for (let i = 1; i < pts.length; i++){ L += pts[i].distanceTo(pts[i-1]); if (i % 4 === 3) TR3.flightEnd.push(L); }
  TR3.len = L;
}
function stairsPoint(t, dist){
  const pts = TR3.path; let d = dist !== undefined ? dist : t * TR3.len;
  for (let i = 1; i < pts.length; i++){
    const seg = pts[i].distanceTo(pts[i-1]);
    if (d <= seg) return pts[i-1].clone().lerp(pts[i], d/seg);
    d -= seg;
  }
  return pts[pts.length-1].clone();
}
function buildEscalator(){
  const g = new THREE.Group(); g.visible = false; R3.scene.add(g);
  const RUNX = 6, RISE = 3.2, ang = Math.atan2(RISE, RUNX), L = Math.hypot(RUNX, RISE);
  const metal = m3(0x9e9e9e, {metalness:.6, roughness:.35}), black = m3(0x212121, {roughness:.5});
  const low = bx(3, .1, 2.6, m3(0xd6d1c8)); low.position.set(-1.5, -.05, 0); g.add(low);
  const high = bx(3, .1, 2.6, m3(0xd6d1c8)); high.position.set(RUNX + 1.5, RISE - .05, 0); g.add(high);
  const upperFloorEdge = bx(3, RISE, .2, m3(0xbdb8af)); upperFloorEdge.position.set(RUNX + 1.5, RISE/2, -1.4); g.add(upperFloorEdge);
  // 踏み段（動く）
  const steps = [];
  for (let i = 0; i < 26; i++){ const st = bx(.38, .06, 1, metal); g.add(st); steps.push(st); }
  const trussGeo = new THREE.BoxGeometry(L, .35, 1.25); const truss = new THREE.Mesh(trussGeo, m3(0x78909c)); truss.position.set(RUNX/2, RISE/2 - .25, 0); truss.rotation.z = ang; g.add(truss);
  for (const z of [-.62, .62]){
    const rail = bx(L + 1.2, .08, .1, black); rail.position.set(RUNX/2, RISE/2 + .95, z); rail.rotation.z = ang; g.add(rail);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(L + .6, .85, .03), m3(0xb3e5fc, {transparent:true, opacity:.3, roughness:.1}));
    glass.position.set(RUNX/2, RISE/2 + .5, z); glass.rotation.z = ang; g.add(glass);
  }
  const lamp = new THREE.PointLight(0xffffff, .9, 10); g.add(lamp);
  g.userData = {steps, RUNX, RISE, ang, L, lamp};
  TR3.esc = g;
  // 歩く道：下の床 → 乗り口 → 上の降り口 → 上の床
  TR3.escPath = [new THREE.Vector3(-2.2, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(RUNX, RISE, 0), new THREE.Vector3(RUNX + 2.2, RISE, 0)];
}
function buildElev(){
  const g = new THREE.Group(); g.visible = false; R3.scene.add(g);
  const steel = m3(0xb0bec5, {metalness:.6, roughness:.35}), dark = m3(0x546e7a, {metalness:.5, roughness:.4});
  const floor = bx(2.2, .1, 2.2, m3(0x6d6058)); floor.position.y = -.05; g.add(floor);
  const back = bx(2.2, 2.4, .08, steel); back.position.set(0, 1.2, -1.1); g.add(back);
  const left = bx(.08, 2.4, 2.2, steel); left.position.set(-1.1, 1.2, 0); g.add(left);
  const right = bx(.08, 2.4, 2.2, steel); right.position.set(1.1, 1.2, 0); g.add(right);
  const rail = bx(1.9, .05, .05, dark); rail.position.set(0, .9, -1.02); g.add(rail);
  const panel = bx(.05, .7, .3, m3(0x263238)); panel.position.set(1.05, 1.15, .6); g.add(panel);
  for (let i = 0; i < 6; i++){ const b = new THREE.Mesh(new THREE.CircleGeometry(.03, 10), m3(0xfff59d, {emissive:0xffca28, emissiveIntensity:.8})); b.position.set(1.02, .95 + (i % 3)*.12, .52 + Math.floor(i/3)*.14); b.rotation.y = -Math.PI/2; g.add(b); }
  const ceil = bx(1.2, .04, 1.2, m3(0xffffff, {emissive:0xffffff, emissiveIntensity:.8})); ceil.position.set(0, 2.42, 0); g.add(ceil);
  const light = new THREE.PointLight(0xffffff, 1.1, 6); light.position.set(0, 2.2, 0); g.add(light);
  const doorL = bx(.6, 2.2, .06, steel), doorR = doorL.clone(); doorL.position.set(-.3, 1.1, 1.1); doorR.position.set(.3, 1.1, 1.1); doorL.visible = doorR.visible = false; g.add(doorL, doorR);
  g.userData = {light, ceil, doorL, doorR};
  TR3.elev = g;
}
let stairHold = false;
cv.addEventListener('pointerdown', () => { if (G.p && G.p.transit && G.p.transit.kind === 'stairs') stairHold = true; });
addEventListener('pointerup', () => { stairHold = false; });
addEventListener('pointercancel', () => { stairHold = false; });

// ---- エレベーターのボタン（自分で押す） ----
const evStyle = document.createElement('style');
evStyle.textContent = `
#evPanel{position:absolute;right:14px;top:50%;transform:translateY(-50%);z-index:4;display:none;background:linear-gradient(#37474f,#263238);border:2px solid #90a4ae;border-radius:12px;padding:10px;box-shadow:0 6px 20px rgba(0,0,0,.5)}
#evPanel .ttl{color:#cfd8dc;font-size:11px;font-weight:800;text-align:center;margin-bottom:6px}
#evPanel .grid{display:grid;grid-template-columns:repeat(2,44px);gap:6px}
#evPanel button{width:44px;height:44px;border-radius:50%;border:2px solid #b0bec5;background:#455a64;color:#fff;font:inherit;font-size:13px;font-weight:900;touch-action:manipulation}
#evPanel button.dest{border-color:#ffca28}
#evPanel button.lit{background:#ff8f00;box-shadow:0 0 12px #ffb300}
#evPanel button.cur{opacity:.55}
#evPanel .row{display:flex;gap:6px;justify-content:center;margin-top:8px}
#evPanel .row button{width:44px;height:36px;border-radius:8px;font-size:12px}
#evMsg{position:absolute;left:50%;bottom:62px;transform:translateX(-50%);z-index:4;display:none;background:rgba(0,0,0,.75);color:#fff;font-weight:800;font-size:14px;padding:8px 16px;border-radius:99px;white-space:nowrap}
@media (max-width:560px){ #evPanel .grid{grid-template-columns:repeat(2,38px)} #evPanel button{width:38px;height:38px;font-size:12px} }`;
document.head.appendChild(evStyle);
const evPanel = document.createElement('div'); evPanel.id = 'evPanel'; $('stage').appendChild(evPanel);
const evMsg = document.createElement('div'); evMsg.id = 'evMsg'; $('stage').appendChild(evMsg);
let evMsgT = 0, evBuiltFor = null;
function evSay(t){ evMsg.textContent = t; evMsg.style.display = 'block'; evMsgT = performance.now() + 1800; }
function evDing(){ if (!AC) return; const t = AC.currentTime; beep(1318.5, t, .5, 'sine', .12); beep(1046.5, t + .25, .7, 'sine', .12); }
function evPress(f){
  const p = G.p, tr = p && p.transit;
  if (!tr || tr.kind !== 'elevator' || tr.phase !== 'wait' || p.stuck) return;
  const f1 = floorOf(tr.dest.area);
  if (f !== f1){ evSay(f === floorOf(G.A.key) ? 'この階です' : `この階には止まりません（行き先は ${floorLabel(f1)}）`); return; }
  tr.phase = 'ride'; tr.until = nowMs() + tr.rideDur*1000; tr.dur = tr.rideDur;
  if (AC) beep(880, AC.currentTime, .12, 'sine', .15);
  buildEvPanel(true);
}
function leaveTransit(){
  const p = G.p;
  const tx = Math.floor(p.x), ty = Math.floor(p.y);
  for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]){
    const x = tx + dx, y = ty + dy;
    if (walk(x, y) && !G.A.portalAt[y*COLS + x]){ p.x = x + .5; p.y = y + .5; break; }
  }
  // 入るときに積んだ「戻り先」がこの場所なら取り除く
  if (p.back && p.back.length && p.back[p.back.length-1].area === G.A.key) p.back.pop();
  p.transit = null; p.lastTile = Math.floor(p.y)*COLS + Math.floor(p.x);
  stopSteps();
  setMsg(`<b>${G.A.name}</b>`);
}
function evOpen(){
  const p = G.p, tr = p && p.transit;
  if (!tr || tr.kind !== 'elevator' || tr.phase !== 'wait' || p.stuck) return;
  // 降りて、エレベーターの前に戻る
  leaveTransit();
  evPanel.style.display = 'none';
}
function buildEvPanel(lit){
  const tr = G.p.transit, f0 = floorOf(G.A.key), f1 = floorOf(tr.dest.area);
  const lo = Math.min(f0, f1), hi = Math.max(f0, f1), floors = [];
  for (let f = hi; f >= lo; f--) if (f !== 0) floors.push(f);
  evPanel.innerHTML = `<div class="ttl">行き先の階を押す</div><div class="grid">${floors.map(f => `<button data-f="${f}" class="${f === f1 ? 'dest' : ''} ${f === f0 ? 'cur' : ''} ${lit && f === f1 ? 'lit' : ''}">${floorLabel(f)}</button>`).join('')}</div><div class="row"><button data-o="1">◀▶<br>開</button><button>▶◀<br>閉</button></div>`;
  evPanel.querySelectorAll('button[data-f]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); evPress(+b.dataset.f); }));
  evPanel.querySelector('button[data-o]').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); evOpen(); });
}
addEventListener('keydown', e => {
  const tr = G.p && G.p.transit;
  if (!tr || tr.kind !== 'elevator' || tr.phase !== 'wait') return;
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE'){ e.preventDefault(); e.stopImmediatePropagation(); evPress(floorOf(tr.dest.area)); }
}, true);
actBtn.addEventListener('pointerdown', () => { const tr = G.p && G.p.transit; if (tr && tr.kind === 'elevator' && tr.phase === 'wait') evPress(floorOf(tr.dest.area)); }, true);
// 移動中は、いつもの場所の代わりにこのシーンを描く。描いたら true
function drawTransit3D(now, dt){
  if (performance.now() > evMsgT) evMsg.style.display = 'none';
  const p = G.p; if (!p || !p.transit) { if (TR3.stairs) TR3.stairs.visible = false; if (TR3.elev) TR3.elev.visible = false; if (TR3.esc) TR3.esc.visible = false; evPanel.style.display = 'none'; evBuiltFor = null; return false; }
  if (!TR3.stairs){ buildStairs(); buildElev(); buildEscalator(); }
  const R = R3, tr = p.transit;
  const f0 = floorOf(G.A.key), f1 = floorOf(tr.dest.area), down = f1 < f0;
  // 階段：スティック・移動キー・画面タッチで自分で降りる（上る）。1フロア＝折り返し1本
  const esc = tr.kind === 'stairs' && G.A.hStyle === 'escalator';
  tr.esc = esc;
  if (tr.kind === 'stairs'){
    if (tr.prog === undefined){ tr.prog = 0; tr.flights = Math.min(TR3.flightEnd.length, Math.max(1, Math.abs(f1 - f0))); }
    if (!p.stuck && tr.prog < 1){
      // 入力の向きを、画面上で「行き先へ続く向き」と比べる：合っていれば進み、逆なら戻る
      const ix = (keys.right?1:0) - (keys.left?1:0), iy = (keys.down?1:0) - (keys.up?1:0);
      const vx = ix || stick.x, vy = iy || stick.y, vm = Math.hypot(vx, vy);
      // ↓（下）＝降りる、↑（上）＝上る。折り返しで画面の向きが変わっても同じキーのまま進める
      // ←→ はいま歩いている段の向きに合わせる
      let dir = 0;
      if (stairHold) dir = 1;
      else if (vm > .2){
        if (Math.abs(vy) >= Math.abs(vx)) dir = (vy > 0) === down ? 1 : -1;
        else if (tr.lastPt && tr.lastAhead){
          const a = proj(tr.lastPt.x, tr.lastPt.y + .5, tr.lastPt.z), b = proj(tr.lastAhead.x, tr.lastAhead.y + .5, tr.lastAhead.z);
          if (a && b && Math.abs(b.X - a.X) > 2) dir = Math.sign(vx) === Math.sign(b.X - a.X) ? 1 : -1;
          else dir = 1;
        }
      }
      if (p.stamina <= 0) p.tired = true;
      if (p.tired && p.stamina >= .5) p.tired = false;
      const running = dir !== 0 && (keys.run || btnRun) && !p.tired;
      p.stamina = clamp(p.stamina + (running ? -dt/3.2 : dt/4.5), 0, 1);
      let sp, len;
      if (esc){
        // エスカレーター：踏み段の上だけ自動で運ばれる。床の上は自分で歩く。逆向きに歩けば戻れる
        len = TR3.escPath.reduce((a, q, i) => i ? a + q.distanceTo(TR3.escPath[i-1]) : 0, 0);
        const d = tr.prog * len, onBelt = d > 2.2 && d < len - 2.2;
        sp = (onBelt ? 1.3 : 0) + dir*(running ? (onBelt ? 3.2 : 5) : (onBelt ? 1.8 : 3.2));
        tr.onBelt = onBelt;
        tr.walkT = (tr.walkT || 0) + dt*(dir ? (running ? 1.6 : 1) : 0);
      } else {
        // 階段：入力した向きに上り下りする（止まっていれば止まる）
        len = TR3.flightEnd[tr.flights - 1];
        sp = dir*(running ? 6.2 : 3.4);
        tr.walkT = (tr.walkT || 0) + dt*(dir ? (running ? 1.6 : 1) : 0);
      }
      tr.walkDir = dir;
      tr.prog = Math.min(1, tr.prog + sp*dt/len);
      tr.running = running;
      // 入口まで戻りきったら、元の階に戻る
      tr.backHold = tr.prog <= 0 && dir < 0 ? (tr.backHold || 0) + dt : 0;
      if (tr.backHold > .35){ tr.prog = 0; leaveTransit(); return drawTransit3D(now, dt); }
      tr.prog = Math.max(0, tr.prog);
      // 2D 版の時間切れで勝手に着かないよう、着くまで待たせる
      tr.until = tr.prog >= 1 ? nowMs() - 1 : nowMs() + 60000;
      tr.dur = 60;
    }
  }
  if (tr.kind === 'elevator'){
    if (!tr.phase){ tr.phase = 'wait'; tr.rideDur = tr.dur; }
    if (tr.phase === 'wait' && !p.stuck){ tr.until = nowMs() + 60000; tr.dur = 60; }
    if (evBuiltFor !== tr){ evBuiltFor = tr; buildEvPanel(false); }
    evPanel.style.display = p.stuck ? 'none' : 'block';
  } else evPanel.style.display = 'none';
  const left = Math.max(0, (tr.until - nowMs())/1000);
  const prog = tr.kind === 'stairs' ? tr.prog : tr.phase === 'wait' ? 0 : (p.stuck ? (tr.stuckProg ?? (tr.stuckProg = 1 - left/tr.dur)) : clamp(1 - left/tr.dur, 0, 1));
  let cur = Math.round(f0 + (f1 - f0)*prog); if (cur === 0) cur = down ? -1 : 1;
  if (W3.group) W3.group.visible = false;
  for (const g of CH3.values()) g.visible = false;
  marker3.visible = false; starMeshes.forEach(m => m.visible = false); pts3.visible = false;
  R.hemi.intensity = .5; R.sun.intensity = .2; R.alarm.intensity = 0; R.torch.intensity = 0;
  R.scene.background.set(0x14181f); R.scene.fog.color.set(0x14181f);
  let me = CH3.get('me'); if (!me){ me = makeChar3(0xff7043); CH3.set('me', me); }
  me.visible = true;
  const shaking = G.state === 'shake' || p.stuck;
  if (tr.kind === 'elevator'){
    TR3.stairs.visible = false; if (TR3.esc) TR3.esc.visible = false; const g = TR3.elev; g.visible = true;
    g.position.set(40, 0, 40);
    const u = g.userData;
    u.doorL.visible = u.doorR.visible = tr.phase !== 'wait';
    const red = !!p.stuck;
    u.light.color.set(red ? 0xff2a2a : 0xffffff); u.light.intensity = red ? (.6 + Math.sin(now/90)*.4) : 1.1;
    u.ceil.material.emissive.set(red ? 0x550000 : 0xffffff);
    g.position.x += shaking ? (Math.random()-.5)*.08 : 0; g.position.y = shaking ? (Math.random()-.5)*.05 : Math.sin(now/300)*.005;
    // かごの中は自由に歩ける（ボタンを押す前も後も）
    if (tr.ex === undefined){ tr.ex = 0; tr.ez = .2; tr.face = Math.PI; }
    let mvx = (keys.right?1:0) - (keys.left?1:0), mvz = (keys.down?1:0) - (keys.up?1:0);
    if (!mvx && !mvz){ mvx = stick.x; mvz = stick.y; }
    const ml = Math.hypot(mvx, mvz), moving = !p.stuck && ml > .2;
    if (moving){
      const sp = 1.6*dt*((keys.run || btnRun) ? 1.5 : 1)/Math.max(1, ml);
      tr.ex = clamp(tr.ex + mvx*sp, -.78, .78); tr.ez = clamp(tr.ez + mvz*sp, -.78, .78);
      tr.face = Math.atan2(mvx, mvz); tr.walkT = (tr.walkT || 0) + dt;
    }
    me.position.set(g.position.x + tr.ex, g.position.y, 40 + tr.ez);
    me.rotation.y += ((tr.face - me.rotation.y + Math.PI*3) % (Math.PI*2) - Math.PI) * .25;
    poseChar3(me, {crouch: p.crouch, walk: moving ? tr.walkT : 0, dead: false}, dt);
    // かごの中（扉の内側）から見る
    if (R.camera.fov !== 74){ R.camera.fov = 74; R.camera.updateProjectionMatrix(); }   // かご全体が見えるよう広角に
    R.camera.position.set(g.position.x + .8, 2.3, 41.02); R.camera.lookAt(g.position.x - .15, .55, 39.7);
  } else if (tr.esc){
    TR3.elev.visible = false; TR3.stairs.visible = false; const g = TR3.esc; g.visible = true;
    g.position.set(-40, 0, -40);
    const u = g.userData;
    // 踏み段を流す（止まると止まる）
    if (!p.stuck) u.off = ((u.off || 0) + dt*1.3*(down ? -1 : 1) + 100) % .4;
    u.steps.forEach((st, i) => { const d = (i*.4 + (u.off || 0)) % (u.L + .4) - .2; st.position.set(Math.cos(u.ang)*d, Math.sin(u.ang)*d + .02, 0); st.visible = d > -.1 && d < u.L + .1; });
    const pts = TR3.escPath, total = pts.reduce((a, q, i) => i ? a + q.distanceTo(pts[i-1]) : 0, 0);
    const dd = (down ? 1 - prog : prog) * total;
    let rem = dd, pt = pts[0].clone();
    for (let i = 1; i < pts.length; i++){ const seg = pts[i].distanceTo(pts[i-1]); if (rem <= seg){ pt = pts[i-1].clone().lerp(pts[i], rem/seg); break; } rem -= seg; pt = pts[i].clone(); }
    pt.add(g.position);
    me.position.copy(pt);
    const ad = clamp(dd + (down ? -.2 : .2), 0, total); let rem2 = ad, ah = pts[0].clone();
    for (let i = 1; i < pts.length; i++){ const seg = pts[i].distanceTo(pts[i-1]); if (rem2 <= seg){ ah = pts[i-1].clone().lerp(pts[i], rem2/seg); break; } rem2 -= seg; ah = pts[i].clone(); }
    ah.add(g.position); tr.lastPt = pt.clone(); tr.lastAhead = ah;
    me.rotation.y = (tr.walkDir || 1) > 0 === down ? -Math.PI/2 : Math.PI/2;
    poseChar3(me, {crouch:false, walk: p.stuck ? 0 : (tr.walkT || 0), dead: !!p.stuck}, dt);
    u.lamp.position.set(pt.x - g.position.x, pt.y + 3, 2);
    if (shaking) g.position.x += (Math.random()-.5)*.1;
    R.camera.position.set(pt.x + .4, pt.y + 2.6, pt.z + 6.4); R.camera.lookAt(pt.x + .3, pt.y + .4, pt.z);
  } else {
    TR3.elev.visible = false; if (TR3.esc) TR3.esc.visible = false; const g = TR3.stairs; g.visible = true;
    g.position.set(-40, 0, 40);
    const total = TR3.flightEnd[tr.flights - 1];
    const d = (down ? prog : 1 - prog) * total;
    const pt = stairsPoint(0, d).add(g.position);
    const ahead = stairsPoint(0, clamp(d + (down ? .15 : -.15), 0, total)).add(g.position);
    me.position.copy(pt);
    tr.lastPt = pt.clone(); tr.lastAhead = ahead.clone();
    if (ahead.distanceTo(pt) > 1e-4){ const back = (tr.walkDir || 1) < 0; me.rotation.y = Math.atan2(ahead.x - pt.x, ahead.z - pt.z) + (back ? Math.PI : 0); }
    // 揺れで転倒
    poseChar3(me, {crouch:false, walk: p.stuck ? 0 : (tr.walkT || 0), dead: !!p.stuck}, dt);
    g.userData.lamp.position.set(pt.x - g.position.x, pt.y - g.position.y + 2, 1);
    if (shaking){ g.position.x += (Math.random()-.5)*.1; }
    R.camera.position.set(pt.x + 1.2, pt.y + 3.4, pt.z + 7.2); R.camera.lookAt(pt.x, pt.y + .3, pt.z + .6);
  }
  R.renderer.render(R.scene, R.camera);
  // 重ね表示：階数・行き先・残り時間
  ctx.fillStyle = 'rgba(0,0,0,.65)'; rr(SW/2 - 150, 14, 300, 92, 12); ctx.fill();
  ctx.textAlign = 'center';
  if (p.stuck){
    ctx.fillStyle = '#ff5252'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText(tr.kind === 'elevator' ? '⚠ 緊急停止' : tr.esc ? '⚠ エスカレーター緊急停止' : '階段で揺れに遭遇！', SW/2, 48);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif';
    ctx.fillText(tr.kind === 'elevator' ? `${floorLabel(cur)} と ${floorLabel(cur + (down ? -1 : 1))} の間で止まりました` : 'バランスを崩して転落…', SW/2, 74);
  } else {
    ctx.fillStyle = '#ffca28'; ctx.font = 'bold 30px sans-serif';
    ctx.fillText(tr.kind === 'elevator' && tr.phase === 'wait' ? floorLabel(f0) : `${down ? '▼' : '▲'} ${floorLabel(cur)}`, SW/2, 52);
    if (tr.kind === 'elevator' && tr.phase === 'wait'){
      ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(SW/2 - 170, SH - 46, 340, 30, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`右のパネルで行き先（${floorLabel(f1)}）のボタンを押す　開：降りる`, SW/2, SH - 26);
    }
    if (tr.kind === 'elevator' && tr.phase === 'ride' && left < .05 && !tr.dinged){ tr.dinged = true; evDing(); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${tr.kind === 'elevator' ? 'エレベーター' : tr.esc ? 'エスカレーター' : '階段'}　${floorLabel(f0)} → ${floorLabel(f1)}　${areaName(tr.dest.area)}`, SW/2, 76);
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(SW/2 - 120, 88, 240, 5);
    ctx.fillStyle = '#ffca28'; ctx.fillRect(SW/2 - 120, 88, 240*prog, 5);
    if (tr.kind === 'stairs'){
      ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(SW/2 - 170, SH - 46, 340, 30, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText(tr.esc ? (tr.onBelt ? `自動で運ばれています（${down ? '↓' : '↑'}で歩く・逆で戻る／Bでダッシュ）` : `${down ? '↓' : '↑'}で歩いて乗り降り（逆に戻れば元の階へ）`) : `${down ? '↓で降りる・↑で戻る' : '↑で上る・↓で戻る'}（戻りきると元の階へ）／Bでダッシュ`, SW/2, SH - 26);
      if (p.stamina < 1){ ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(SW/2 - 60, SH - 58, 120, 6); ctx.fillStyle = p.tired ? '#ff3d00' : '#4fc3f7'; ctx.fillRect(SW/2 - 60, SH - 58, 120*p.stamina, 6); }
    }
  }
  if (G.state === 'alert' || G.state === 'shake'){
    const a = (Math.sin(now/120)+1)/2 * .14;
    const grd = ctx.createRadialGradient(SW/2, SH/2, 120, SW/2, SH/2, 420);
    grd.addColorStop(0, 'rgba(255,0,0,0)'); grd.addColorStop(1, `rgba(255,0,0,${a*3})`);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, SW, SH);
  }
  drawVerdict();
  return true;
}
