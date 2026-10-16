// ====== 移動中の専用シーン（階段の吹き抜け・エレベーターのかご） ======
const TR3 = {stairs:null, elev:null, path:null, len:0};
// 動き（updateTransit）・ボタン・重ね表示（drawTransitHud）は 2D 版と共通。ここは 3D の見た目だけ
function buildStairs(){
  // 乗り降りするだけのシンプルな階段：下の床 → まっすぐな階段1本 → 上の床
  const g = new THREE.Group(); g.visible = false; R3.scene.add(g);
  const stepM = m3(0x9e9e9e), railM = m3(0xfdd835), wallM = m3(0xcfd2d6), floorM = m3(0xb0b4b9), noseM = m3(0xffca28);
  const {N, RUNX, H} = TRG.stairs, RUN = RUNX/N, RISE = H/N, W = 1.4;
  const low = bx(3, .1, 2.6, floorM); low.position.set(-1.5, -.05, 0); g.add(low);
  const high = bx(3, .1, 2.6, floorM); high.position.set(RUNX + 1.5, H - .05, 0); g.add(high);
  const edge = bx(3, H, .2, m3(0xbdb8af)); edge.position.set(RUNX + 1.5, H/2, -1.4); g.add(edge);
  for (let s = 0; s < N; s++){
    const y = (s + 1)*RISE;
    const st = bx(RUN, y, W, stepM); st.position.set((s + .5)*RUN, y/2, 0); g.add(st);
    const nose = bx(.04, .02, W, noseM); nose.position.set(s*RUN + .02, y + .01, 0); g.add(nose);   // 段鼻のすべり止め
  }
  const ang = Math.atan2(H, RUNX), L = Math.hypot(RUNX, H);
  for (const z of [-W/2 - .05, W/2 + .05]){
    const rail = bx(L + .6, .05, .05, railM); rail.position.set(RUNX/2, H/2 + .9, z); rail.rotation.z = ang; g.add(rail);
    for (const t of [0, .5, 1]){ const post = bx(.04, .9, .04, railM); post.position.set(RUNX*t, H*t + .45, z); g.add(post); }
  }
  const back = bx(RUNX + 6, H + 4, .1, wallM); back.position.set(RUNX/2, H/2 + 1, -1.5); g.add(back);
  const sg = bx(.5, .3, .04, m3(0x2e7d32, {emissive:0x1b5e20, emissiveIntensity:.6})); sg.position.set(RUNX + 1.5, H + 1.6, -1.28); g.add(sg);
  const lamp = new THREE.PointLight(0xffffff, .9, 9); g.add(lamp); g.userData.lamp = lamp;
  TR3.stairs = g;
  TR3.path = transitPath('stairs').map(([x, y]) => new THREE.Vector3(x, y, 0));
  TR3.len = pathLen(transitPath('stairs'));
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
  const RUNX = TRG.esc.RUNX, RISE = TRG.esc.H, ang = Math.atan2(RISE, RUNX), L = Math.hypot(RUNX, RISE);
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
  TR3.escPath = transitPath('esc').map(([x, y]) => new THREE.Vector3(x, y, 0));
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
// 移動中は、いつもの場所の代わりにこのシーンを描く。描いたら true
function drawTransit3D(now, dt){
  const p = G.p; if (!p || !p.transit) { if (TR3.stairs) TR3.stairs.visible = false; if (TR3.elev) TR3.elev.visible = false; if (TR3.esc) TR3.esc.visible = false; return false; }
  if (!TR3.stairs){ buildStairs(); buildElev(); buildEscalator(); }
  const R = R3, tr = p.transit;
  const f0 = floorOf(G.A.key), f1 = floorOf(tr.dest.area), down = f1 < f0;
  const prog = transitProg(tr);
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
    const moving = !!tr.moving;
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
    if (!p.stuck && G.state !== 'shake') u.off = ((u.off || 0) + dt*1.3*(down ? -1 : 1) + 100) % .4;
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
    const total = TR3.len;
    const d = (down ? 1 - prog : prog) * total;   // 道は下の床から上の床へ
    const pt = stairsPoint(0, d).add(g.position);
    const ahead = stairsPoint(0, clamp(d + (down ? -.15 : .15), 0, total)).add(g.position);
    me.position.copy(pt);
    tr.lastPt = pt.clone(); tr.lastAhead = ahead.clone();
    if (ahead.distanceTo(pt) > 1e-4){ const back = (tr.walkDir || 1) < 0; me.rotation.y = Math.atan2(ahead.x - pt.x, ahead.z - pt.z) + (back ? Math.PI : 0); }
    // 揺れで転倒
    poseChar3(me, {crouch:false, walk: p.stuck ? 0 : (tr.walkT || 0), dead: !!p.stuck}, dt);
    g.userData.lamp.position.set(pt.x - g.position.x, pt.y - g.position.y + 3, 2);
    if (shaking){ g.position.x += (Math.random()-.5)*.1; }
    R.camera.position.set(pt.x + .4, pt.y + 3, pt.z + 7); R.camera.lookAt(pt.x + .3, pt.y + 1.2, pt.z);   // 上の表示に人が隠れないよう少し上を見る
  }
  R.renderer.render(R.scene, R.camera);
  // ←→ で進む向き：画面で行き先のほうが右なら +1（動きは updateTransit で共通）
  if (tr.lastPt && tr.lastAhead){
    const a = proj(tr.lastPt.x, tr.lastPt.y + .5, tr.lastPt.z), b = proj(tr.lastAhead.x, tr.lastAhead.y + .5, tr.lastAhead.z);
    if (a && b && Math.abs(b.X - a.X) > 2) tr.fwdX = Math.sign(b.X - a.X);
  }
  drawTransitHud(now);
  return true;
}
