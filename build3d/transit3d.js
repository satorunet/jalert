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
// 移動中は、いつもの場所の代わりにこのシーンを描く。描いたら true
function drawTransit3D(now, dt){
  const p = G.p; if (!p || !p.transit) { if (TR3.stairs) TR3.stairs.visible = false; if (TR3.elev) TR3.elev.visible = false; return false; }
  if (!TR3.stairs){ buildStairs(); buildElev(); }
  const R = R3, tr = p.transit;
  const f0 = floorOf(G.A.key), f1 = floorOf(tr.dest.area), down = f1 < f0;
  // 階段：スティック・移動キー・画面タッチで自分で降りる（上る）。1フロア＝折り返し1本
  if (tr.kind === 'stairs'){
    if (tr.prog === undefined){ tr.prog = 0; tr.flights = Math.min(TR3.flightEnd.length, Math.max(1, Math.abs(f1 - f0))); }
    if (!p.stuck && tr.prog < 1){
      const ix = (keys.right?1:0) - (keys.left?1:0), iy = (keys.down?1:0) - (keys.up?1:0);
      const inp = Math.max(Math.hypot(ix, iy), Math.hypot(stick.x, stick.y), stairHold ? 1 : 0);
      if (p.stamina <= 0) p.tired = true;
      if (p.tired && p.stamina >= .5) p.tired = false;
      const running = inp > .2 && (keys.run || btnRun) && !p.tired;
      p.stamina = clamp(p.stamina + (running ? -dt/3.2 : inp > .2 ? dt/7 : dt/3.5), 0, 1);
      if (inp > .2){
        const len = TR3.flightEnd[tr.flights - 1];
        tr.prog = Math.min(1, tr.prog + (running ? 6.5 : 4)*Math.min(1, inp)*dt/len);
        tr.walkT = (tr.walkT || 0) + dt*(running ? 1.6 : 1);
      }
      tr.running = running;
      // 2D 版の時間切れで勝手に着かないよう、着くまで待たせる
      tr.until = tr.prog >= 1 ? nowMs() - 1 : nowMs() + 60000;
      tr.dur = 60;
    }
  }
  const left = Math.max(0, (tr.until - nowMs())/1000);
  const prog = tr.kind === 'stairs' ? tr.prog : (p.stuck ? (tr.stuckProg ?? (tr.stuckProg = 1 - left/tr.dur)) : clamp(1 - left/tr.dur, 0, 1));
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
    TR3.stairs.visible = false; const g = TR3.elev; g.visible = true;
    g.position.set(40, 0, 40);
    const u = g.userData;
    const red = !!p.stuck;
    u.light.color.set(red ? 0xff2a2a : 0xffffff); u.light.intensity = red ? (.6 + Math.sin(now/90)*.4) : 1.1;
    u.ceil.material.emissive.set(red ? 0x550000 : 0xffffff);
    g.position.x += shaking ? (Math.random()-.5)*.08 : 0; g.position.y = shaking ? (Math.random()-.5)*.05 : Math.sin(now/300)*.005;
    me.position.set(g.position.x, g.position.y, 40); me.rotation.y = 0;
    poseChar3(me, {crouch: p.crouch, walk: 0, dead: false}, dt);
    R.camera.position.set(40 + .2, 2.6, 43.4); R.camera.lookAt(40, 1, 40);
  } else {
    TR3.elev.visible = false; const g = TR3.stairs; g.visible = true;
    g.position.set(-40, 0, 40);
    const total = TR3.flightEnd[tr.flights - 1];
    const d = (down ? prog : 1 - prog) * total;
    const pt = stairsPoint(0, d).add(g.position);
    const ahead = stairsPoint(0, clamp(d + (down ? .15 : -.15), 0, total)).add(g.position);
    me.position.copy(pt);
    if (ahead.distanceTo(pt) > 1e-4) me.rotation.y = Math.atan2(ahead.x - pt.x, ahead.z - pt.z);
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
    ctx.fillText(tr.kind === 'elevator' ? '⚠ 緊急停止' : '階段で揺れに遭遇！', SW/2, 48);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif';
    ctx.fillText(tr.kind === 'elevator' ? `${floorLabel(cur)} と ${floorLabel(cur + (down ? -1 : 1))} の間で止まりました` : 'バランスを崩して転落…', SW/2, 74);
  } else {
    ctx.fillStyle = '#ffca28'; ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`${down ? '▼' : '▲'} ${floorLabel(cur)}`, SW/2, 52);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${tr.kind === 'elevator' ? 'エレベーター' : '階段'}　${floorLabel(f0)} → ${floorLabel(f1)}　${areaName(tr.dest.area)}`, SW/2, 76);
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(SW/2 - 120, 88, 240, 5);
    ctx.fillStyle = '#ffca28'; ctx.fillRect(SW/2 - 120, 88, 240*prog, 5);
    if (tr.kind === 'stairs'){
      ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(SW/2 - 170, SH - 46, 340, 30, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`スティック・矢印キー・画面タッチで階段を${down ? '降りる' : '上る'}（Bでダッシュ）`, SW/2, SH - 26);
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
