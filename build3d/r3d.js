// =====================================================================
// ====== 3D 表示（ゲームの中身は 2D 版と共通。描画だけを three.js に） ======
// =====================================================================
const R3 = (() => {
  const stage = $('stage');
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.id = 'gl';
  stage.insertBefore(renderer.domElement, cv);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10151d);
  scene.fog = new THREE.Fog(0x10151d, 20, 46);
  const camera = new THREE.PerspectiveCamera(48, 640/416, .1, 200);
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x3a3028, .8); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dd, .8);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left:-13, right:13, top:13, bottom:-13, near:1, far:50});
  scene.add(sun, sun.target);
  const alarm = new THREE.PointLight(0xff2020, 0, 34);
  const torch = new THREE.PointLight(0xfff0c8, 0, 7.5, 1.4);
  scene.add(alarm, torch);
  function resize(){
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    SW = r.width < 700 ? Math.round(Math.max(320, r.width)) : Math.round(r.width/1.25); SH = Math.round(SW * r.height / r.width);
    cv.width = SW*DPR; cv.height = SH*DPR;
  }
  new ResizeObserver(resize).observe(stage); resize();
  return {renderer, scene, camera, hemi, sun, alarm, torch};
})();
const V3 = new THREE.Vector3();
const matCache = {};
function m3(color, opt){
  const key = color + ':' + JSON.stringify(opt || {});
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial(Object.assign({color, roughness:.8, metalness:0}, opt || {}));
  return matCache[key];
}
function bx(w, h, d, m){ const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.castShadow = true; me.receiveShadow = true; return me; }
function cyl(rt, rb, h, m, seg){ const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 12), m); me.castShadow = true; return me; }

// ---- エリアの絵（2D 版の描画をそのままテクスチャにする） ----
const FLAT_UNDER = new Set(['D','Z','Q','J','H','U','Y','X','E','T','A','M','O','N','C','V','K','S','B','#','W','F','%','L','~']);
function paintArea(A, full){
  const c = document.createElement('canvas'); c.width = COLS*T*2; c.height = ROWS*T*2;
  const old = ctx, oldState = G.state;
  ctx = c.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  G.state = 'normal';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++){
    const ch = A.grid[y][x];
    if (full || !FLAT_UNDER.has(ch)) drawTile(A, ch, x, y);
    else if (ch === 'L' || ch === '~' || ch === '%') drawTile(A, ch, x, y);
    else drawTile(A, A.indoor ? (ch === '#' || ch === 'W' ? '#' : '.') : (ch === 'B' || ch === 'E' || ch === 'F' ? '.' : ch === 'T' ? 'G' : '.'), x, y);
  }
  if (!full) drawDecor(A);
  G.state = oldState; ctx = old;
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
  return {tex, canvas: c};
}
// 箱の天面に、2D 版のそのマスの絵を貼る
function topMapped(geo, cx, cz){
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 8; i < 12; i++){
    const wx = cx + pos.getX(i), wz = cz + pos.getZ(i);
    uv.setXY(i, wx / COLS, 1 - wz / ROWS);
  }
  uv.needsUpdate = true;
}
function tileColor(img, x, y){
  let r = 0, g = 0, b = 0, n = 0;
  for (let yy = 10; yy < 54; yy += 6) for (let xx = 10; xx < 54; xx += 6){
    const i = ((y*64 + yy) * img.width + (x*64 + xx)) * 4;
    r += img.data[i]; g += img.data[i+1]; b += img.data[i+2]; n++;
  }
  return new THREE.Color(r/n/255*.82, g/n/255*.82, b/n/255*.82).convertSRGBToLinear();
}
const SOLID_H = {'#':1.25, 'S':1.75, 'K':1.45, 'C':.45, 'N':.5, 'B':3.0, 'F':3.0, 'A':.95, 'O':2.5, 'V':1.05, 'W':1.25};
function tileHeight(A, ch, x, y){
  if (ch === 'K') return ({campfire:.25, stove:.95, case:1.15, arcade:1.6, speaker:1.9, shower:1.1, cooler:1.8})[A.kStyle] || SOLID_H.K;
  if (ch === 'S') return ({container:2.4, rack:2.3, toys:1.0, ufo:1.7, shoebox:1.4, locker:1.7, goods:1.6, market:1.4})[A.sStyle] || SOLID_H.S;
  if (ch === 'B') return ({house:2.3, toilet:2.1, attraction:2.6, evac:4.5, school:3.5, store:2.6, shrine:1.6})[A.bStyle] || 2.6 + ((x*7 + y*3) % 4)*.45;
  if (ch === 'N') return ({register:.95, stall:1.5, bar:1.05, reception:1.05, shrine: y === 3 ? .75 : .95})[A.nStyle] || .48;
  if (ch === 'C') return A.cStyle === 'tent' ? 1.1 : .45;
  return SOLID_H[ch] || 1;
}

// ---- ステージの組み立て ----
const W3 = {key:null, group:null, furn:[], panes:[], lamps:[], swing:[], water:null, rubble:null, green:null, stars:[], groundH:null};
function groundH(x, z){
  if (!G.A) return 0;
  const ch = tileOf(G.A, x, z);
  if (ch === 'M') return G.A.key === 'beach' && x >= 16 ? 1.3 : .55;
  if (ch === 'Z') return .38;
  return 0;
}
function buildArea(A){
  const R = R3;
  if (W3.group) R.scene.remove(W3.group);
  const grp = new THREE.Group(); R.scene.add(grp);
  Object.assign(W3, {key: A.key + ':' + (G.seed || 0), group: grp, furn: [], panes: [], lamps: [], swing: [], water: null, rubble: null, rubbleItems: null, green: null, stars: [], torii: null, wheel: null});
  const ground = paintArea(A, false), top = paintArea(A, true);
  const img = top.canvas.getContext('2d').getImageData(0, 0, top.canvas.width, top.canvas.height);
  const gm = new THREE.MeshStandardMaterial({map: ground.tex, roughness: .9});
  const tm = new THREE.MeshStandardMaterial({map: top.tex, roughness: .85});
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(COLS, ROWS), gm);
  gp.rotation.x = -Math.PI/2; gp.position.set(COLS/2, 0, ROWS/2); gp.receiveShadow = true; grp.add(gp);
  // 外側の床（マップの外が真っ暗にならないように）
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), m3(A.indoor ? 0x161b24 : 0x3b4a32));
  outer.rotation.x = -Math.PI/2; outer.position.set(COLS/2, -.02, ROWS/2); outer.receiveShadow = true; grp.add(outer);
  const fixed = G.seed ? hz(A).fixed : new Set();
  const block = (x, y, w, h, d, side, ox, oz, y0) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const cx = x + .5 + (ox || 0), cz = y + .5 + (oz || 0);
    topMapped(geo, cx, cz);
    const me = new THREE.Mesh(geo, [side, side, tm, side, side, side]);
    me.position.set(cx, (y0 || 0) + h/2, cz); me.castShadow = true; me.receiveShadow = true;
    return me;
  };
  const sideOf = (x, y) => new THREE.MeshStandardMaterial({color: tileColor(img, x, y), roughness: .85});
  const sideCache = {};
  const side = (x, y, ch) => { const k = ch + (ch === '#' || ch === 'W' ? '' : x + ',' + y); return sideCache[k] || (sideCache[k] = sideOf(x, y)); };
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++){
    const ch = A.grid[y][x], X = x + .5, Z = y + .5;
    if (ch === '#' || ch === 'F' || ch === 'B'){
      if (ch === 'B' && A.bStyle === 'shrine') continue;
      grp.add(block(x, y, 1, tileHeight(A, ch, x, y), 1, side(x, y, ch)));
    } else if (ch === 'W'){
      grp.add(block(x, y, 1, .55, 1, side(x, y, '#')));
      const horiz = (tileOf(A, x-.5, y+.5) === 'W' || tileOf(A, x+1.5, y+.5) === 'W' || tileOf(A, x-.5, y+.5) === '#' || tileOf(A, x+1.5, y+.5) === '#');
      const pane = bx(horiz ? 1 : .1, .7, horiz ? .1 : 1, m3(0x9fd8f0, {transparent:true, opacity:.42, roughness:.08, metalness:.3}));
      pane.position.set(X, .9, Z); pane.castShadow = false; grp.add(pane);
      const frame = bx(horiz ? 1 : .12, .06, horiz ? .12 : 1, m3(0xb0bec5)); frame.position.set(X, 1.26, Z); grp.add(frame);
      W3.panes.push({x: X, z: Z, mesh: pane, broken: false});
    } else if (ch === 'S' || ch === 'K'){
      const h = tileHeight(A, ch, x, y);
      if (ch === 'K' && A.kStyle === 'campfire'){
        const logs = cyl(.08, .08, .7, m3(0x6d4c41)); logs.rotation.z = Math.PI/2; logs.position.set(X, .1, Z); grp.add(logs);
        const fire = new THREE.Mesh(new THREE.ConeGeometry(.22, .55, 8), m3(0xff7043, {emissive: 0xff5722, emissiveIntensity: .9}));
        fire.position.set(X, .38, Z); grp.add(fire); W3.lamps.push({mesh: fire, fire: true});
        const fl = new THREE.PointLight(0xff8a50, 1.2, 4); fl.position.set(X, .8, Z); grp.add(fl);
        continue;
      }
      // 倒れる家具：前の下のふちを支点に回す
      const pivot = new THREE.Group(); pivot.position.set(X, 0, Z + .4);
      const me = block(x, y, .9, h, .62, side(x, y, ch), 0, -.08);
      me.position.set(0, h/2, -.48); pivot.add(me);
      grp.add(pivot);
      W3.furn.push({x, y, pivot, fixed: fixed.has(y*COLS + x)});
    } else if (ch === 'D'){
      const dg = new THREE.Group(); dg.position.set(X, 0, Z);
      const topGeo = new THREE.BoxGeometry(.94, .06, .94); topMapped(topGeo, X, Z);
      const tp = new THREE.Mesh(topGeo, [m3(0x6d4c41), m3(0x6d4c41), tm, m3(0x6d4c41), m3(0x6d4c41), m3(0x6d4c41)]);
      tp.position.y = .74; tp.castShadow = true; tp.receiveShadow = true; dg.add(tp);
      for (const [lx, lz] of [[-.41,-.41],[.41,-.41],[-.41,.41],[.41,.41]]){ const l = bx(.05, .72, .05, m3(0x5d4037)); l.position.set(lx, .36, lz); dg.add(l); }
      grp.add(dg);
    } else if (ch === 'Z'){
      grp.add(block(x, y, .96, .36, .96, m3(0xeceff1)));
    } else if (ch === 'Q'){
      grp.add(block(x, y, .9, .42, .7, side(x, y, ch), 0, .08));
      const back = bx(.9, .5, .12, side(x, y, ch)); back.position.set(X, .55, Z - .3); grp.add(back);
    } else if (ch === 'C'){
      if (A.cStyle === 'tent'){
        const tent = new THREE.Mesh(new THREE.ConeGeometry(.62, 1.1, 4), sideOf(x, y));
        tent.position.set(X, .55, Z); tent.rotation.y = Math.PI/4; tent.castShadow = true; grp.add(tent);
      } else grp.add(block(x, y, .96, .45, .9, side(x, y, ch)));
    } else if (ch === 'N'){
      const h = tileHeight(A, ch, x, y);
      if (A.nStyle === 'stall'){
        grp.add(block(x, y, .9, .9, .8, m3(0x8d6e63)));
        const roof = bx(1, .08, .95, m3(x % 2 ? 0xe53935 : 0xfafafa)); roof.position.set(X, 1.5, Z); grp.add(roof);
        for (const lx of [-.42, .42]){ const p = cyl(.03, .03, 1.5, m3(0x795548)); p.position.set(X + lx, .75, Z + .4); grp.add(p); }
      } else if (A.nStyle === 'shrine' && y !== 3){
        grp.add(block(x, y, .9, .55, .8, m3(0x9e9e9e)));
        const roof = bx(1.05, .1, 1, m3(0x5d4037)); roof.position.set(X, 1.6, Z); grp.add(roof);
        for (const lx of [-.44, .44]){ const p = cyl(.04, .04, 1.6, m3(0x5d4037)); p.position.set(X + lx, .8, Z); grp.add(p); }
      } else grp.add(block(x, y, .94, h, .8, side(x, y, ch)));
    } else if (ch === 'O'){
      if (A.oStyle === 'pole'){ const p = cyl(.05, .05, 2.2, m3(0xfdd835, {metalness:.4, roughness:.4})); p.position.set(X, 1.1, Z); grp.add(p); }
      else if (A.oStyle === 'komainu' || A.oStyle === 'statue'){
        grp.add(block(x, y, .6, .5, .6, m3(0x9e9e9e)));
        const s = new THREE.Mesh(new THREE.SphereGeometry(.28, 14, 10), m3(A.oStyle === 'statue' ? 0xf5f5f5 : 0xbdbdbd)); s.position.set(X, .85, Z); s.castShadow = true; grp.add(s);
        const hd = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 9), m3(A.oStyle === 'statue' ? 0xf5f5f5 : 0xbdbdbd)); hd.position.set(X, 1.2, Z); hd.castShadow = true; grp.add(hd);
      } else grp.add(block(x, y, .62, 2.5, .62, side(x, y, ch)));
    } else if (ch === 'V'){
      if (A.vStyle === 'shrine' && y === 10){ continue; }   // 鳥居の柱は下でまとめて作る
      const vg = new THREE.Group(); vg.position.set(X, 0, Z + .3);
      if (A.vStyle === 'shrine'){
        const b1 = bx(.3, .2, .3, m3(0x9e9e9e)); b1.position.set(0, .1, -.3); vg.add(b1);
        const p1 = cyl(.07, .07, .7, m3(0x9e9e9e)); p1.position.set(0, .55, -.3); vg.add(p1);
        const h1 = bx(.42, .26, .42, m3(0xffe082, {emissive: 0xffb300, emissiveIntensity: .35})); h1.position.set(0, 1.0, -.3); vg.add(h1);
        const r1 = new THREE.Mesh(new THREE.ConeGeometry(.38, .3, 4), m3(0x757575)); r1.position.set(0, 1.28, -.3); r1.rotation.y = Math.PI/4; vg.add(r1);
      } else if (A.vStyle === 'lamp' && y !== 11){
        const p1 = cyl(.05, .07, 2.3, m3(0x37474f)); p1.position.set(0, 1.15, -.3); vg.add(p1);
        const h1 = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 9), m3(0xfff59d, {emissive: 0xfff176, emissiveIntensity: .6})); h1.position.set(0, 2.35, -.3); vg.add(h1);
      } else if (A.vStyle === 'park'){
        const c = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047][(x + y) % 4];
        for (const [a, b] of [[-.35,-.65],[.35,-.65],[-.35,.05],[.35,.05]]){ const p = cyl(.03, .03, 1.3, m3(c)); p.position.set(a, .65, b); vg.add(p); }
        for (const hh of [.65, 1.3]){ const r = bx(.74, .04, .74, m3(c)); r.position.set(0, hh, -.3); vg.add(r); }
      } else {
        const wall = bx(1, 1.05, .32, side(x, y, ch)); wall.position.set(0, .52, -.3); vg.add(wall);
      }
      grp.add(vg); W3.swing.push({g: vg, x, y});
    } else if (ch === 'T'){
      if (A.key === 'shrine'){
        const t1 = new THREE.Mesh(new THREE.ConeGeometry(.5, 2.6, 8), m3(0x1b3d22)); t1.position.set(X, 1.5, Z); t1.castShadow = true; grp.add(t1);
      } else {
        const tr = cyl(.09, .12, 1.1, m3(0x6d4c41)); tr.position.set(X, .55, Z); grp.add(tr);
        const lf = new THREE.Mesh(new THREE.SphereGeometry(.55, 12, 10), m3(0x33691e)); lf.position.set(X, 1.45, Z); lf.castShadow = true; grp.add(lf);
      }
    } else if (ch === 'A'){
      if (A.key === 'warehouse'){
        grp.add(block(x, y, .8, .8, .8, m3(0xf9a825)));
        for (const lx of [-.32, .32]){ const m = bx(.06, 2, .06, m3(0x424242)); m.position.set(X + lx, 1, Z - .4); grp.add(m); }
      } else {
        const car = block(x, y, .86, .55, .95, side(x, y, ch), 0, 0, .12); grp.add(car);
        const cab = bx(.7, .32, .55, m3(0x263238, {roughness:.3})); cab.position.set(X, .82, Z); grp.add(cab);
      }
    } else if (ch === 'M'){
      const h = A.key === 'beach' && x >= 16 ? 1.3 : .55;
      grp.add(block(x, y, 1, h, 1, m3(A.key === 'beach' && x >= 16 ? 0x90a4ae : 0x7f9a4f)));
    } else if (ch === 'J'){
      const lamp = new THREE.Group(); lamp.position.set(X, 2.7, Z);
      const cord = cyl(.01, .01, .6, m3(0x424242)); cord.position.y = -.3; lamp.add(cord);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 9), m3(0xfff59d, {emissive: 0xfff176, emissiveIntensity: .8})); bulb.position.y = -.65; lamp.add(bulb);
      grp.add(lamp); W3.lamps.push({mesh: lamp, x, y});
    } else if (ch === 'H' || ch === 'U'){
      // 階段（U は地下へ下りる階段）
      const down = ch === 'U' || (A.portalAt[y*COLS + x] && AREAS[A.portalAt[y*COLS + x].to] && AREAS[A.portalAt[y*COLS + x].to].underground);
      for (let i = 0; i < 4; i++){
        const st = bx(1, .12, .25, m3(A.hStyle === 'escalator' ? 0x9e9e9e : 0x78909c));
        st.position.set(X, down ? -.06 - i*.12 : .06 + i*.12, Z - .375 + i*.25); grp.add(st);
      }
      if (A.hStyle === 'escalator') for (const lx of [-.48, .48]){ const r = bx(.06, .5, 1, m3(0x212121)); r.position.set(X + lx, .45, Z); grp.add(r); }
    } else if (ch === 'Y'){
      // エレベーターの扉（枠＋扉）
      const fr = bx(1, 2.1, .12, m3(0x90a4ae, {metalness:.5, roughness:.4})); fr.position.set(X, 1.05, Z - .44); grp.add(fr);
      const dr = bx(.8, 1.9, .14, m3(0xcfd8dc, {metalness:.6, roughness:.3})); dr.position.set(X, .95, Z - .43); grp.add(dr);
    } else if (ch === 'X' || ch === 'E'){
      const fc = A.xStyle === 'shutter' ? 0x607d8b : 0x2e7d32;
      for (const lx of [-.47, .47]){ const p = bx(.08, 2, .08, m3(fc)); p.position.set(X + lx, 1, Z); grp.add(p); }
      const li = bx(1, .1, .1, m3(fc)); li.position.set(X, 2, Z); grp.add(li);
    } else if (ch === '~'){
      // 水面は別にまとめる
    }
  }
  // 水面
  if ((A.byChar['~'] || []).length){
    const water = new THREE.Mesh(new THREE.PlaneGeometry(COLS, ROWS), m3(A.key === 'sento' ? 0x7fd3e6 : 0x2b7bb9, {transparent:true, opacity:.75, roughness:.15, metalness:.2}));
    water.rotation.x = -Math.PI/2; water.position.set(COLS/2, -.05, ROWS/2);
    const mask = document.createElement('canvas'); mask.width = COLS; mask.height = ROWS; const mc = mask.getContext('2d');
    for (const q of A.byChar['~']){ mc.fillStyle = '#fff'; mc.fillRect(q.x, q.y, 1, 1); }
    water.material = water.material.clone(); water.material.alphaMap = new THREE.CanvasTexture(mask); water.material.alphaMap.magFilter = THREE.NearestFilter;
    grp.add(water);
  }
  buildDecor3D(A, grp);
  // 星
  W3.starGeo = W3.starGeo || new THREE.OctahedronGeometry(.18);
  // 安全な場所（結果表示用、最初は非表示）
  W3.green = new THREE.Group(); W3.green.visible = false; grp.add(W3.green);
  W3.greenFor = null;
}
// 大きな装飾（鳥居・本殿・観覧車・ステージ・電車・船・避難タワー・パラソル）
function buildDecor3D(A, grp){
  const k = A.key;
  if (k === 'shrine'){
    // 本殿
    const body = bx(7.6, 1.6, 2.6, m3(0x6d4c41)); body.position.set(10, .8, 1.5); grp.add(body);
    const wallw = bx(6.6, 1.1, .05, m3(0xf5ecd7)); wallw.position.set(10, .8, 2.82); grp.add(wallw);
    for (let i = 0; i < 5; i++){ const p = cyl(.08, .08, 1.7, m3(0xc62828)); p.position.set(7 + i*1.5, .85, 2.85); grp.add(p); }
    const sh = new THREE.Shape(); sh.moveTo(-1.9, 0); sh.lineTo(0, 1.15); sh.lineTo(1.9, 0); sh.lineTo(1.6, -.12); sh.lineTo(0, .9); sh.lineTo(-1.6, -.12); sh.closePath();
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, {depth: 8.6, bevelEnabled: false}), m3(0x3e2723));
    roof.rotation.y = Math.PI/2; roof.position.set(5.7, 1.6, 1.5); roof.castShadow = true; grp.add(roof);
    const rope = cyl(.05, .05, 6.4, m3(0xd7c49e)); rope.rotation.z = Math.PI/2; rope.position.set(10, 1.55, 2.95); grp.add(rope);
    // 鳥居
    const red = m3(0xd84315);
    const torii = new THREE.Group(); torii.position.set(10, 0, 10.5);
    for (const px of [-2.5, 2.5]){ const p = cyl(.14, .16, 2.7, red); p.position.set(px, 1.35, 0); torii.add(p); }
    const nuki = bx(6.2, .16, .16, red); nuki.position.set(0, 2.25, 0); torii.add(nuki);
    const kasa = bx(7.2, .2, .32, m3(0x212121)); kasa.position.set(0, 2.75, 0); torii.add(kasa);
    const kasa2 = bx(6.8, .12, .26, red); kasa2.position.set(0, 2.6, 0); torii.add(kasa2);
    grp.add(torii); W3.torii = torii;
  }
  if (k === 'amusement'){
    const wheel = new THREE.Group(); wheel.position.set(4, 3.4, 1.4);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, .06, 8, 48), m3(0x90a4ae)); wheel.add(ring);
    for (let i = 0; i < 10; i++){
      const a = i*Math.PI/5;
      const sp = bx(.04, 2.6, .04, m3(0x90a4ae)); sp.position.set(Math.cos(a)*1.3, Math.sin(a)*1.3, 0); sp.rotation.z = a - Math.PI/2; wheel.add(sp);
      const gd = bx(.4, .4, .4, m3([0xe53935, 0xfdd835, 0x1e88e5, 0x43a047, 0xab47bc][i % 5])); gd.position.set(Math.cos(a)*2.6, Math.sin(a)*2.6, 0); wheel.add(gd);
    }
    grp.add(wheel); W3.wheel = wheel;
    const legs = bx(.15, 3.4, .15, m3(0x78909c)); legs.position.set(4, 1.7, 1.4); grp.add(legs);
    const pts = []; for (let x = 12; x <= 20; x += .25) pts.push(new THREE.Vector3(x, 3 + Math.sin(x*1.3)*1.4, 1.2));
    const track = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, .08, 6), m3(0xd32f2f)); track.castShadow = true; grp.add(track);
  }
  if (k === 'livehouse'){
    const st = bx(16, .5, 2, m3(0x3e2c4a)); st.position.set(10, .25, 2); grp.add(st);
    const dr = cyl(.35, .35, .4, m3(0xe0e0e0)); dr.position.set(10, .7, 1.8); grp.add(dr);
    for (const mx of [6, 14]){ const mic = cyl(.02, .02, 1.3, m3(0x212121)); mic.position.set(mx, 1.15, 2.2); grp.add(mic); }
  }
  if (k === 'station' || k === 'subway'){
    const tr = bx(12, 1.6, 1.8, m3(0xeceff1)); tr.position.set(7, .8, 11); grp.add(tr);
    const band = bx(12.02, .2, 1.82, m3(k === 'subway' ? 0xf57f17 : 0x2e7d32)); band.position.set(7, .8, 11); grp.add(band);
  }
  if (k === 'port'){
    const ship = bx(9, 1.2, 1.6, m3(0xeceff1)); ship.position.set(8.5, .3, 11.8); grp.add(ship);
    const br = bx(2.4, .9, 1, m3(0xfafafa)); br.position.set(10.2, 1.3, 11.8); grp.add(br);
  }
  if (k === 'beach'){
    for (const [px, pz, c] of [[4, 7.5, 0xe53935], [9, 8.6, 0x1e88e5], [13, 7.2, 0xfdd835]]){
      const pole = cyl(.03, .03, 1.9, m3(0x5d4037)); pole.position.set(px, .95, pz); grp.add(pole);
      const um = new THREE.Mesh(new THREE.ConeGeometry(.9, .4, 10), m3(c)); um.position.set(px, 1.95, pz); um.castShadow = true; grp.add(um);
    }
    const tw = bx(2, 2.4, 2, m3(0x78909c)); tw.position.set(17, 1.2 - .01, 7); tw.visible = false; grp.add(tw);
  }
  if (k === 'gym'){
    for (const hx of [1.3, 18.7]){ const bd = bx(.08, .8, 1.2, m3(0xfafafa)); bd.position.set(hx, 2.4, 6); grp.add(bd); const rim = new THREE.Mesh(new THREE.TorusGeometry(.22, .02, 6, 16), m3(0xff7043)); rim.rotation.x = Math.PI/2; rim.position.set(hx + (hx < 10 ? .3 : -.3), 2.1, 6); grp.add(rim); }
  }
  if (k === 'school3'){
    const bb = bx(10, 1, .06, m3(0x2e5d3a)); bb.position.set(9, 1.3, 1.02); grp.add(bb);
  }
}

// ---- キャラクター ----
const CH3 = new Map();
function makeChar3(color){
  const g = new THREE.Group();
  const bodyM = new THREE.MeshStandardMaterial({color, roughness:.8});
  const skinM = new THREE.MeshStandardMaterial({color:0xffcc80, roughness:.8});
  const hairM = new THREE.MeshStandardMaterial({color:0x4e342e, roughness:.9});
  const legM = new THREE.MeshStandardMaterial({color:0x37474f, roughness:.9});
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.19, .23, .62, 14), bodyM); body.position.y = .55; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 12), skinM); head.position.y = 1.03; head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.19, 16, 12, 0, Math.PI*2, 0, Math.PI/2), hairM); hair.position.y = 1.05;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(.1, .3, .1), legM), legR = legL.clone();
  legL.position.set(-.09, .15, 0); legR.position.set(.09, .15, 0);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(.08, .42, .08), bodyM), armR = armL.clone();
  armL.position.set(-.26, .62, 0); armR.position.set(.26, .62, 0);
  const inner = new THREE.Group(); inner.add(body, head, hair, legL, legR, armL, armR);
  g.add(inner);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.28, 16), new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:.25, depthWrite:false}));
  shadow.rotation.x = -Math.PI/2; shadow.position.y = .015; g.add(shadow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .42, 24), new THREE.MeshBasicMaterial({color:0xff1e1e, transparent:true, opacity:0, depthWrite:false, side:THREE.DoubleSide}));
  ring.rotation.x = -Math.PI/2; ring.position.y = .02; g.add(ring);
  const soul = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 10), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0}));
  g.add(soul);
  g.userData = {inner, body, head, hair, legL, legR, armL, armR, shadow, ring, soul, bodyM, skinM, hairM, legM, color: new THREE.Color(color), deadT: 0, wasDead: false};
  R3.scene.add(g);
  return g;
}
const GRAY = new THREE.Color(0x8a8a8a);
function poseChar3(g, o, dt){
  const u = g.userData;
  // 死亡：バタッと倒れて灰色になり、魂が昇る
  if (o.dead){
    if (!u.wasDead){ u.wasDead = true; u.deadT = 0; }
    u.deadT += dt;
    const k = Math.min(1, u.deadT/0.35);
    u.inner.rotation.x = -Math.PI/2 * (1 - Math.pow(1-k, 3));
    u.inner.position.set(0, .18*k, .35*k);
    u.legL.rotation.x = u.legR.rotation.x = 0; u.armL.rotation.x = u.armR.rotation.x = 0;
    u.body.scale.set(1, 1, 1); u.body.position.y = .55; u.head.position.y = 1.03; u.hair.position.y = 1.05;
    u.legL.visible = u.legR.visible = true;
    u.bodyM.color.copy(u.color).lerp(GRAY, Math.min(1, u.deadT*1.5));
    u.skinM.color.set(0xffcc80).lerp(new THREE.Color(0xbdbdbd), Math.min(1, u.deadT*1.5));
    const st = u.deadT - .5;
    u.soul.material.opacity = st > 0 ? Math.max(0, .75 - st*.25) : 0;
    u.soul.position.set(Math.sin(st*3)*.12, .6 + Math.max(0, st)*.9, .3);
    u.soul.scale.setScalar(1 + Math.max(0, st)*.15);
    return;
  }
  if (u.wasDead){ u.wasDead = false; u.inner.rotation.x = 0; u.inner.position.set(0, 0, 0); u.bodyM.color.copy(u.color); u.skinM.color.set(0xffcc80); u.soul.material.opacity = 0; }
  if (o.crouch){
    // だんごむしのポーズ
    u.body.scale.set(1.2, .6, 1.25); u.body.position.y = .3; u.head.position.y = .52; u.hair.position.y = .54;
    u.legL.visible = u.legR.visible = false;
    u.armL.position.set(-.16, .62, .04); u.armR.position.set(.16, .62, .04);
    u.armL.rotation.set(0, 0, -.9); u.armR.rotation.set(0, 0, .9);
    u.inner.rotation.x = .35;
  } else {
    const w = o.walk || 0, s = Math.sin(w*10), bob = Math.abs(s)*.03;
    u.body.scale.set(1, 1, 1); u.body.position.y = .55 + bob; u.head.position.y = 1.03 + bob; u.hair.position.y = 1.05 + bob;
    u.legL.visible = u.legR.visible = true;
    u.legL.rotation.x = s*.55; u.legR.rotation.x = -s*.55;
    u.armL.position.set(-.26, .62 + bob, 0); u.armR.position.set(.26, .62 + bob, 0);
    u.armL.rotation.set(-s*.5, 0, 0); u.armR.rotation.set(s*.5, 0, 0);
    u.inner.rotation.x = 0;
  }
  u.shadow.position.y = .015 - (o.hop || 0);
  u.ring.material.opacity = o.pressure > 1 ? clamp((o.pressure - 1)/3, 0, 1)*.6 : 0;
}
function syncChar(id, o, color, dt){
  let g = CH3.get(id);
  if (!g){ g = makeChar3(color); CH3.set(id, g); }
  if (!g.userData.color.equals(new THREE.Color(color))){ g.userData.color.set(color); if (!o.dead) g.userData.bodyM.color.set(color); }
  g.visible = true; g.userData.seen = true;
  const gh = groundH(o.x, o.z);
  g.position.set(o.x, gh + (o.hop || 0), o.z);
  if (o.dx || o.dz){ const a = Math.atan2(o.dx, o.dz); g.rotation.y += ((a - g.rotation.y + Math.PI*3) % (Math.PI*2) - Math.PI) * .25; }
  poseChar3(g, o, dt);
}

// ---- 自分の目印・星・粒子・がれき ----
const marker3 = new THREE.Mesh(new THREE.ConeGeometry(.14, .28, 4), new THREE.MeshBasicMaterial({color:0xffd600}));
marker3.rotation.x = Math.PI; R3.scene.add(marker3);
const PMAX = 900;
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PMAX*3), 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PMAX*3), 3));
const pts3 = new THREE.Points(pGeo, new THREE.PointsMaterial({size:.09, vertexColors:true, transparent:true, opacity:.9}));
R3.scene.add(pts3);
const tmpC = new THREE.Color();
const starMeshes = [];
const streak3 = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1, 6), new THREE.MeshBasicMaterial({color:0xffe0b0}));
streak3.visible = false; R3.scene.add(streak3);
const boom3 = new THREE.Mesh(new THREE.TorusGeometry(1, .08, 8, 48), new THREE.MeshBasicMaterial({color:0xffc878, transparent:true}));
boom3.rotation.x = Math.PI/2; boom3.visible = false; R3.scene.add(boom3);
const tsunami3 = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({color:0x1e6ec8, transparent:true, opacity:.8, roughness:.2}));
tsunami3.rotation.x = -Math.PI/2; tsunami3.visible = false; R3.scene.add(tsunami3);
const fallRocks = [];

// 画面上の位置（オーバーレイ 640×416 の座標）
function proj(x, h, z){
  V3.set(x, h, z).project(R3.camera);
  if (V3.z > 1) return null;
  return {X: (V3.x + 1)/2 * COLS*T, Y: (1 - V3.y)/2 * ROWS*T};
}

let lastAreaTex = 0;
function draw3D(now, dt){
  const R = R3, st = G.state;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0, 0, COLS*T, ROWS*T);
  if (!G.A){
    R.renderer.setClearColor(0x0b0f17); R.renderer.clear();
    drawTitleBg(now);
    return;
  }
  const A = G.A, p = G.p;
  const wantKey = A.key + ':' + (G.seed || 0);
  if (W3.key !== wantKey) buildArea(A);
  if (drawTransit3D(now, dt)) return;
  if (R.camera.fov !== 48){ R.camera.fov = 48; R.camera.updateProjectionMatrix(); }
  if (W3.group) W3.group.visible = true;
  pts3.visible = true;
  // ---- 明るさ（屋外・屋内・夜・薄暗い） ----
  const night = G.scene && G.scene.night;
  const base = A.indoor ? .78 : 1.0;
  R.hemi.intensity = night ? .12 : base * (1 - (A.dim || 0)*1.2);
  R.sun.intensity = night ? .05 : A.indoor ? .55 : .95;
  R.torch.intensity = night ? 1.6 : 0;
  R.scene.background.set(night ? 0x05070d : A.indoor ? 0x10151d : 0x9cc7e8);
  R.scene.fog.color.copy(R.scene.background);
  // ---- 揺れ ----
  const k = G.phaseT || 0;
  if (W3.group) W3.group.position.set(G.shakeAmt ? (Math.random()-.5)*G.shakeAmt*.025 : 0, 0, G.shakeAmt ? (Math.random()-.5)*G.shakeAmt*.025 : 0);
  // 家具：揺れて、途中から倒れる（固定された家具はあまり動かない）
  for (const f of W3.furn){
    let ang = 0;
    if (st === 'shake') ang = Math.sin(k*13 + f.x)*.08 + (k > 1.5 ? Math.min(1.45, (k - 1.5)*.9) : 0);
    else if (st === 'after' || st === 'result') ang = G.type === 'eq' ? f.pivot.rotation.x : 0;
    if (f.fixed && G.L <= 2 && st === 'shake') ang *= .12;
    f.pivot.rotation.x = st === 'shake' || st === 'after' || st === 'result' ? (st === 'shake' ? ang : f.pivot.rotation.x) : 0;
  }
  const boomT = G.boomT ? (nowMs() - G.boomT)/1000 : -1;
  for (const s of W3.swing){
    // ミサイルの爆風では塀・灯籠・街灯などが倒れる
    if (boomT >= 0) s.g.rotation.x = Math.min(1.5, boomT*2.2) * ((s.x + s.y) % 2 ? 1 : .8);
    else if (st === 'shake') s.g.rotation.x = k > 1 ? Math.sin(k*10 + s.x)*.12*(1 + G.L*.3) + (G.L >= 2 && k > 2.4 ? Math.min(1.4, (k - 2.4)*.8) : 0) : 0;
    else if (st !== 'after' && st !== 'result') s.g.rotation.x = 0;
  }
  if (W3.torii){
    // 鳥居：爆風で倒れる／大地震でも倒れる
    let r = 0;
    if (boomT >= 0) r = Math.min(1.5, Math.pow(Math.max(0, boomT - .05)*1.6, 1.6));
    else if (st === 'shake') r = Math.sin(k*8)*.04 + (G.L >= 2 && k > 2.2 ? Math.min(1.5, (k - 2.2)*.7) : 0);
    else if (st === 'after' || st === 'result') r = W3.torii.rotation.x;
    W3.torii.rotation.x = r;
  }
  for (const l of W3.lamps){ if (l.fire){ l.mesh.scale.y = 1 + Math.sin(now/90)*.15; continue; } l.mesh.rotation.z = st === 'shake' ? Math.sin(k*9 + l.x)*.35*(1 + G.L*.4) : Math.sin(now/1500 + l.x)*.02; }
  // 窓ガラスが割れる
  const breakPane = pn => { if (pn.broken) return; pn.broken = true; pn.mesh.visible = false; for (let i = 0; i < 6; i++) spawn(pn.x - .5 + Math.random(), pn.z - .5 + Math.random(), (Math.random()-.5)*3, (Math.random()-.5)*3, 'rgba(200,240,255,.95)', 3, .8 + Math.random()*.6); };
  if (st === 'shake' && k > .8) for (const pn of W3.panes) if (Math.random() < dt*.9) breakPane(pn);
  if (G.boomT) for (const pn of W3.panes) breakPane(pn);
  if (st === 'normal' || st === 'spectate'){ for (const pn of W3.panes){ pn.broken = false; pn.mesh.visible = true; } }
  if (W3.wheel) W3.wheel.rotation.z = now/6000;
  // ---- キャラクター ----
  for (const g of CH3.values()) g.userData.seen = false;
  const fxT = G.fx ? (nowMs() - G.fx.t0)/1000 : -1;
  const decided = !!(G.res && G.frozen);
  const others = decided ? G.frozen : [...NET.players.values()];
  for (const o of others){
    if (o.a !== A.key || o.hidden || (!decided && o.tr)) continue;
    const jt = o.jumpT0 ? (performance.now() - o.jumpT0)/1000 : 9;
    syncChar('p' + o.id, {x:o.x, z:o.y, crouch:!!o.c, walk:o.walk, hop: jt < .42 ? Math.sin(jt/.42*Math.PI)*.55 : 0, dead: decided && !o.alive && fxT > .45, dx:o.vx, dz:o.vy}, new THREE.Color().setHSL((o.hue||0)/360, .65, .55).getHex(), dt);
  }
  for (const n of G.npcs || []){
    if (n.a !== A.key || n.transit) continue;
    const nd = n.path && n.path[0] ? {dx: n.path[0].x + .5 - n.x, dz: n.path[0].y + .5 - n.y} : {};
    syncChar(n.id, {x:n.x, z:n.y, crouch:!!n.c, walk:n.walk, dead: n.crushed || (decided && !n.alive && fxT > .45), pressure: decided ? 0 : n.pressure, dx: nd.dx, dz: nd.dz},
      n.col ? new THREE.Color(n.col).getHex() : new THREE.Color().setHSL(n.hue/360, .35, .6).getHex(), dt);
  }
  if (p && !p.transit){
    const dead = p.crushed || (G.res && !G.res.alive && fxT > .45);
    syncChar('me', {x:p.x, z:p.y, crouch:p.crouch, walk:p.walk, hop:(p.hop||0)/14*.6, dead, pressure: G.res ? 0 : p.pressure, dx: p.dir && p.moving ? p.dir.x : 0, dz: p.dir && p.moving ? p.dir.y : 0}, 0xff7043, dt);
    marker3.visible = !G.res;
    marker3.position.set(p.x, groundH(p.x, p.y) + (p.hop||0)/14*.6 + (p.crouch ? 1.0 : 1.5) + Math.sin(now/180)*.06, p.y);
    marker3.material.color.set(st === 'alert' || st === 'shake' ? 0xff1744 : 0xffd600);
  } else marker3.visible = false;
  for (const [id, g] of CH3) if (!g.userData.seen){ g.visible = false; if (!G.res) { R.scene.remove(g); CH3.delete(id); } }
  // ---- 星 ----
  const sts = G.stars.filter(s => s.a === A.key);
  while (starMeshes.length < sts.length){ const m = new THREE.Mesh(new THREE.OctahedronGeometry(.18), new THREE.MeshStandardMaterial({color:0xffd600, emissive:0xffb300, emissiveIntensity:.6})); R.scene.add(m); starMeshes.push(m); }
  starMeshes.forEach((m, i) => { const s = sts[i]; m.visible = !!s; if (s){ m.position.set(s.x, .55 + Math.sin(now/300 + i)*.08, s.y); m.rotation.y = now/500; } });
  // ---- 粒子（ガラス・本・がれき） ----
  const pa = pGeo.attributes.position.array, ca = pGeo.attributes.color.array;
  let n = 0;
  for (const q of G.particles){
    if (n >= PMAX) break;
    pa[n*3] = q.x; pa[n*3+1] = .2 + Math.max(0, q.life)*.8; pa[n*3+2] = q.y;
    tmpC.setStyle(String(q.color).replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgb($1,$2,$3)'));
    ca[n*3] = tmpC.r; ca[n*3+1] = tmpC.g; ca[n*3+2] = tmpC.b; n++;
  }
  pGeo.setDrawRange(0, n); pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
  // がれき（崩落した場所）
  if (G.res && G.seed && !W3.rubble){
    // 崩落した場所：その場所らしい物が落ちてきて積もる
    W3.rubble = new THREE.Group(); W3.rubbleItems = [];
    const t0 = G.fx ? G.fx.t0 : nowMs();
    for (const q of hz(A).spots){ const items = dropDebris(debrisList(A), q.x, q.y, 7, .8, t0, -.2); items.forEach(m => W3.rubble.add(m)); W3.rubbleItems.push(...items); }
    W3.group.add(W3.rubble);
  }
  if (W3.rubbleItems) animDebris(W3.rubbleItems, nowMs());
  // 自分に落ちてくる物（看板・天井・がれき）
  if (G.fx && !G.fx.alive && ['building','debris','blast','landslide','glass'].includes(G.fx.cause) && !fallRocks.length){
    // 頭上から落ちてくる物も、その場所らしい物（外の建物なら看板・ガラス、土砂崩れなら土砂と岩）
    const list = G.fx.cause === 'landslide' ? ['soil','soil','stone','branch'] : G.fx.cause === 'glass' ? ['glass','glass','glass'] : G.fx.cause === 'building' && !A.indoor ? (A.bStyle === 'house' || A.bStyle === 'shrine' ? ['tile','tile','stone'] : ['sign','glass','tileW']) : debrisList(A);
    dropDebris(list, G.fx.to.x, G.fx.to.y, 9, .7, G.fx.t0, 0).forEach(m => { R.scene.add(m); fallRocks.push(m); });
  }
  if (!G.fx && fallRocks.length){ fallRocks.forEach(r => R.scene.remove(r)); fallRocks.length = 0; }
  if (fallRocks.length) animDebris(fallRocks, nowMs());
  // 津波：高台以外が水につかる
  tsunami3.visible = !!(A.tsunami && G.res && G.fx);
  if (tsunami3.visible){ const kk = clamp((nowMs() - G.fx.t0)/1600, 0, 1); tsunami3.position.set(COLS/2, -.1 + kk*.6, ROWS/2); }
  // ミサイル：落ちてくる光と衝撃波
  streak3.visible = st === 'pass' && !G.boomT;
  if (streak3.visible){
    const kk = clamp(G.phaseT/1.0, 0, 1), tx = A.indoor ? COLS/2 : G.mPt.x, tz = A.indoor ? -3 : G.mPt.y;
    const sx = tx + 10, sy = 18, cx = sx + (tx - sx)*kk, cy = sy + (0 - sy)*kk;
    streak3.position.set((sx + cx)/2, (sy + cy)/2, tz); streak3.scale.y = Math.hypot(cx - sx, cy - sy) + .01; streak3.rotation.z = Math.atan2(cx - sx, -(cy - sy));
  }
  boom3.visible = !!G.boomT && (nowMs() - G.boomT) < 1600;
  if (boom3.visible){ const t = (nowMs() - G.boomT)/1000; boom3.position.set(A.indoor ? COLS/2 : G.mPt.x, .3, A.indoor ? -3 : G.mPt.y); boom3.scale.setScalar(1 + t*14); boom3.material.opacity = 1 - t/1.6; }
  // 結果：最も安全な場所を緑に
  if (st === 'result'){
    if (W3.greenFor !== G.R.id){
      W3.greenFor = G.R.id; W3.green.clear();
      const gm = new THREE.MeshBasicMaterial({color:0x4cff78, transparent:true, opacity:.4, depthWrite:false});
      for (const key of perfectSet(A)){ const pl = new THREE.Mesh(new THREE.PlaneGeometry(.94, .94), gm); pl.rotation.x = -Math.PI/2; pl.position.set(key % COLS + .5, groundH(key % COLS + .5, Math.floor(key/COLS) + .5) + .03, Math.floor(key/COLS) + .5); W3.green.add(pl); }
    }
    W3.green.visible = true; W3.green.children.forEach(c => c.material.opacity = .3 + Math.sin(now/250)*.15);
  } else if (W3.green) W3.green.visible = false;
  // 警報の赤い光
  R.alarm.intensity = (st === 'alert' || st === 'shake') ? (Math.sin(now/120) + 1) * 1.1 : 0;
  // ---- カメラ ----
  const px = p ? p.x : COLS/2, pz = p ? p.y : ROWS/2;
  const zt = (performance.now() - (G.zoomT0 || -1e9))/1000;
  let dist = 1;
  if (zt < 1.6){ const kk = clamp((zt - .7)/.9, 0, 1); dist = .38 + .62*(1 - Math.pow(1 - kk, 3)); }
  // 死んだら自分の体にゆっくり寄る
  if (G.res && !G.res.alive && fxT > .5) dist = Math.max(.45, 1 - (fxT - .5)*.25);
  const camT = V3.set(px, groundH(px, pz) + .5, pz).clone();
  R.camera.position.lerp(new THREE.Vector3(px, camT.y + 9.5*dist, pz + 6.8*dist), zt < 1.6 ? 1 : .12);
  if (G.shakeAmt > 0){ R.camera.position.x += (Math.random()-.5)*G.shakeAmt*.05; R.camera.position.y += (Math.random()-.5)*G.shakeAmt*.03; }
  R.camera.lookAt(camT);
  R.sun.position.set(px + 6, 15, pz + 8); R.sun.target.position.set(px, 0, pz);
  R.alarm.position.set(px, 4, pz);
  R.torch.position.set(px, 1.8, pz);
  R.renderer.render(R.scene, R.camera);

  // =================== 2D の重ね表示 ===================
  // 場所のラベル・出入口の案内
  ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
  for (const l of A.labels || []) if (!PORTAL_LABEL_RE.test(l.t)){ const s = proj(l.x, 1.4, l.y); if (s) tag(s.X, s.Y, l.t, 'rgba(0,0,0,.5)'); }
  portalSigns3D(A);
  // 名札・判定
  const tagFor = (x, z, h, txt, bg) => { const s = proj(x, groundH(x, z) + h, z); if (s) tag(s.X, s.Y, txt, bg); };
  for (const o of others){
    if (o.a !== A.key || o.hidden || (!decided && o.tr)) continue;
    if (decided && fxT > .9) tagFor(o.x, o.y, 1.55, o.alive ? `生存 ${o.name}` : `死亡 ${o.name}（${causeName(o.cause, A)}）`, o.alive ? 'rgba(46,125,50,.9)' : 'rgba(183,28,28,.9)');
    else tagFor(o.x, o.y, 1.55, o.name, 'rgba(0,0,0,.55)');
  }
  for (const nn of G.npcs || []){
    if (nn.a !== A.key || nn.transit) continue;
    if (decided && fxT > .9) tagFor(nn.x, nn.y, 1.5, nn.alive ? `生存 ${nn.name}` : `死亡 ${nn.name}（${causeName(nn.cause, A)}）`, nn.alive ? 'rgba(46,125,50,.9)' : 'rgba(183,28,28,.9)');
    else tagFor(nn.x, nn.y, 1.5, nn.name, 'rgba(60,60,60,.6)');
  }
  if (p && !p.transit && G.res && fxT > .9) tagFor(p.x, p.y, 1.6, G.res.alive ? '生存 あなた' : `死亡 あなた（${causeName(G.res.cause, A)}）`, G.res.alive ? '#2e7d32' : '#b71c1c');
  // 吹き出し（2D 版と同じ）
  const nowB = nowMs();
  const bub = (x, z, h, text) => { const s = proj(x, groundH(x, z) + h, z); if (s) bubble(s.X, s.Y + 20, text); };
  for (const nn of G.npcs || []) if (nn.a === A.key && !nn.transit && nn.say && nn.say.until > nowB) bub(nn.x, nn.y, 1.75, nn.say.text);
  for (const o of NET.players.values()) if (o.a === A.key && o.say && o.say.until > nowB) bub(o.x, o.y, 1.8, o.say.text);
  if (p && !p.transit && p.say && p.say.until > nowB) bub(p.x, p.y, 2.0, p.say.text);
  // スタミナ
  if (p && !p.transit && p.stamina < 1 && !G.res){
    const s = proj(p.x, groundH(p.x, p.y), p.y);
    if (s){ ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(s.X-14, s.Y+8, 28, 4); ctx.fillStyle = p.tired ? '#ff3d00' : p.stamina > .3 ? '#4fc3f7' : '#ff7043'; ctx.fillRect(s.X-14, s.Y+8, 28*p.stamina, 4); }
  }
  // 死んだときの画面（赤く暗く）
  if (G.res && !G.res.alive && fxT > .45 && (st === 'shake' || st === 'pass' || st === 'after')){
    const a = clamp((fxT - .45)/1.2, 0, 1);
    const g = ctx.createRadialGradient(COLS*T/2, ROWS*T/2, 60, COLS*T/2, ROWS*T/2, 380);
    g.addColorStop(0, `rgba(40,0,0,${a*.15})`); g.addColorStop(1, `rgba(20,0,0,${a*.75})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, COLS*T, ROWS*T);
  }
  // 移動中（階段・エレベーター）
  if (p && p.transit){
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0,0,COLS*T,ROWS*T);
    const left = Math.max(0, (p.transit.until - nowMs())/1000);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.stuck ? (p.transit.kind === 'elevator' ? 'エレベーター緊急停止！' : '階段で揺れに遭遇！') : (p.transit.kind === 'elevator' ? 'エレベーターで移動中…' : '階段で移動中…'), COLS*T/2, ROWS*T/2 - 6);
    if (!p.stuck){
      ctx.font = '14px sans-serif'; ctx.fillText(`→ ${areaName(p.transit.dest.area)}　${left.toFixed(1)}秒`, COLS*T/2, ROWS*T/2 + 20);
      ctx.fillStyle = '#ffca28'; ctx.fillRect(COLS*T/2-100, ROWS*T/2+32, 200*(1-left/p.transit.dur), 5);
    }
  }
  if (st === 'alert' || st === 'shake'){
    const a = (Math.sin(now/120)+1)/2 * (G.type === 'eq' ? .14 : .1);
    const grd = ctx.createRadialGradient(COLS*T/2, ROWS*T/2, 120, COLS*T/2, ROWS*T/2, 420);
    grd.addColorStop(0, 'rgba(255,0,0,0)'); grd.addColorStop(1, `rgba(255,0,0,${a*3})`);
    ctx.fillStyle = grd; ctx.fillRect(0,0,COLS*T,ROWS*T);
  }
  if (G.boomT){ const t = (nowMs() - G.boomT)/1000; if (t < .8){ ctx.fillStyle = `rgba(255,250,235,${(1-t/.8)*.95})`; ctx.fillRect(0,0,COLS*T,ROWS*T); } }
  if (st === 'spectate'){ ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0,0,COLS*T,ROWS*T); tag(COLS*T/2, 24, '見学中（次のラウンドから参加）', 'rgba(0,0,0,.7)'); }
  drawLocation();
  if (st !== 'result') drawVerdict();
}
// 出入口の案内（3D 上の位置に）
function portalSigns3D(A){
  const groups = new Map();
  for (const pt of A.portals || []){
    let destArea;
    if (pt.to === '@back'){ const b = backDest(A, (G.p && G.p.back) || [], false); destArea = b && b.area; }
    else destArea = pt.to;
    if (!destArea || !AREAS[destArea]) continue;
    const arrow = pt.y === 0 ? '↑' : pt.y === ROWS-1 ? '↓' : pt.x === 0 ? '←' : pt.x === COLS-1 ? '→' : (AREAS[destArea].underground || /1階|ロビー/.test(AREAS[destArea].name) && pt.kind !== 'door' ? '↓' : pt.kind === 'door' ? '→' : '↕');
    const head = pt.kind === 'elevator' ? 'EV ' : pt.kind === 'stairs' ? '階段 ' : '';
    const base = `${head}${arrow}${destArea}`;
    let key = null;
    for (const [k2, g2] of groups) if (k2.startsWith(base + '#') && Math.abs(g2.lx - pt.x) <= 1 && Math.abs(g2.ly - pt.y) <= 1){ key = k2; break; }
    if (!key) key = base + '#' + groups.size;
    const g = groups.get(key) || {n:0, x:0, y:0, txt:`${head}${arrow} ${areaName(destArea)}`};
    g.n++; g.x += pt.x+.5; g.y += pt.y+.5; g.lx = pt.x; g.ly = pt.y; groups.set(key, g);
  }
  for (const g of groups.values()){
    const s = proj(g.x/g.n, 2.3, g.y/g.n); if (!s) continue;
    ctx.font = 'bold 10px sans-serif';
    const w = ctx.measureText(g.txt).width + 12;
    const x = clamp(s.X, w/2 + 2, COLS*T - w/2 - 2);
    ctx.fillStyle = 'rgba(27,94,32,.92)'; rr(x - w/2, s.Y - 10, w, 15, 5); ctx.fill();
    ctx.strokeStyle = '#a5d6a7'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(g.txt, x, s.Y + 1);
  }
}
// 画面タップで移動（地面の位置を求めて、そこまで歩く）
const ray3 = new THREE.Raycaster(), ndc3 = new THREE.Vector2(), plane0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit3 = new THREE.Vector3();
function tapToTile(e){
  const r = cv.getBoundingClientRect();
  ndc3.set((e.clientX - r.left)/r.width*2 - 1, -((e.clientY - r.top)/r.height*2 - 1));
  ray3.setFromCamera(ndc3, R3.camera);
  if (!ray3.ray.intersectPlane(plane0, hit3)) return null;
  return {tx: Math.floor(hit3.x), ty: Math.floor(hit3.z)};
}
