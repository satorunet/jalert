// ====== 場所ごとの落下物・がれき ======
// 崩落した場所のがれきや、頭上から落ちてくる物を、その場所らしい物にする
const DEBRIS = {
  home:['light','book','dish','frame'], bedroom:['light','book','frame','clock'], mansion:['light','frame','book','dish'], hotel:['light','frame','panel','tv'],
  homeOut:['tile','tile','stone','glass'], beach:['tile','stone','glass'],
  school3:['panel','tube','book','chalk'], school1:['panel','tube','shoe','glass'], schoolYard:['glass','stone','panel'], gym:['tube','panel','ball'],
  office:['panel','tube','paper','monitor'], lobby:['chandelier','glass','panel'], evacBldg:['panel','tube'],
  hospital:['panel','tube','bottle','paper'], theater:['speaker','tube','panel'],
  town:['sign','glass','stone','tileW'], chika:['panel','glass','tube','sign'], station:['sign','panel','tube'], subway:['panel','sign','tube'],
  train:['luggage','bag','strap'], airport:['panel','glass','luggage'],
  super:['can','veg','bottle','pack'], konbini:['bottle','can','snack','pack'], mall2:['glass','panel','sign'], mall1:['glass','sign','veg'],
  parking:['stone','glass'], ugParking:['stone','stone','panel'], warehouse:['box','box','pallet'], port:['crate','box','stone'],
  library:['book','book','book','tube'], restaurant:['dish','glass','light','bottle'], museum:['frame','stone','glass'],
  shrine:['tile','tile','stone','wood'], park:['branch','stone','leaf'], camp:['soil','stone','branch','soil'],
  stadium:['panel','sign','stone'], sento:['tileW','basin','glass'], amusement:['sign','bulb','stone'],
  livehouse:['speaker','tube','bottle'], nursery:['toy','toy','panel','crayon'], arcade:['sign','plush','panel'],
};
const DBG = {};
function dGeo(k, make){ return DBG[k] || (DBG[k] = make()); }
function mkDebris(type){
  const r = Math.random;
  const pick = a => a[Math.floor(r()*a.length)];
  let m;
  switch (type){
    case 'panel': m = new THREE.Mesh(dGeo('panel', () => new THREE.BoxGeometry(.6, .03, .6)), m3(0xf2f2ee)); break;
    case 'tube': m = new THREE.Mesh(dGeo('tube', () => new THREE.CylinderGeometry(.03, .03, 1.1, 8)), m3(0xffffff, {emissive:0xdddddd, emissiveIntensity:.4})); m.rotation.z = Math.PI/2; break;
    case 'light': m = new THREE.Mesh(dGeo('light', () => new THREE.CylinderGeometry(.25, .3, .12, 14)), m3(0xfff8e1, {emissive:0xffe082, emissiveIntensity:.3})); break;
    case 'chandelier': m = new THREE.Mesh(dGeo('chand', () => new THREE.OctahedronGeometry(.3)), m3(0xffe082, {metalness:.6, roughness:.3})); break;
    case 'book': m = new THREE.Mesh(dGeo('book', () => new THREE.BoxGeometry(.22, .05, .3)), m3(pick([0xef5350, 0x42a5f5, 0x66bb6a, 0xffca28, 0xab47bc, 0x8d6e63]))); break;
    case 'dish': m = new THREE.Mesh(dGeo('dish', () => new THREE.CylinderGeometry(.14, .1, .03, 14)), m3(0xfafafa)); break;
    case 'frame': m = new THREE.Mesh(dGeo('frame', () => new THREE.BoxGeometry(.4, .03, .3)), m3(pick([0x8d6e63, 0xffd54f, 0x5d4037]))); break;
    case 'clock': m = new THREE.Mesh(dGeo('clock', () => new THREE.CylinderGeometry(.14, .14, .04, 16)), m3(0xfafafa)); break;
    case 'tv': m = new THREE.Mesh(dGeo('tv', () => new THREE.BoxGeometry(.5, .05, .3)), m3(0x212121)); break;
    case 'tile': m = new THREE.Mesh(dGeo('tile', () => new THREE.CylinderGeometry(.16, .16, .3, 8, 1, false, 0, Math.PI)), m3(pick([0x37474f, 0x455a64, 0x3e2723]), {side: THREE.DoubleSide})); break;
    case 'tileW': m = new THREE.Mesh(dGeo('tileW', () => new THREE.BoxGeometry(.18, .03, .18)), m3(pick([0xe0f2f1, 0xb2dfdb, 0xeceff1, 0xd7ccc8]))); break;
    case 'stone': m = new THREE.Mesh(dGeo('stone' + Math.floor(r()*3), () => new THREE.DodecahedronGeometry(.13 + r()*.08)), m3(pick([0x8d8d8d, 0x7d7468, 0xa1958a]))); break;
    case 'glass': m = new THREE.Mesh(dGeo('glass', () => new THREE.BoxGeometry(.3, .01, .2)), m3(0xb3e5fc, {transparent:true, opacity:.6, roughness:.05, metalness:.3})); break;
    case 'sign': m = new THREE.Mesh(dGeo('sign', () => new THREE.BoxGeometry(.6, .05, .3)), m3(pick([0xe53935, 0xfdd835, 0x1e88e5, 0x43a047, 0xff7043]))); break;
    case 'speaker': m = new THREE.Mesh(dGeo('spk', () => new THREE.BoxGeometry(.3, .4, .3)), m3(0x111111)); break;
    case 'monitor': m = new THREE.Mesh(dGeo('mon', () => new THREE.BoxGeometry(.4, .03, .28)), m3(0x263238)); break;
    case 'paper': m = new THREE.Mesh(dGeo('paper', () => new THREE.BoxGeometry(.2, .005, .28)), m3(0xffffff)); break;
    case 'chalk': m = new THREE.Mesh(dGeo('chalk', () => new THREE.BoxGeometry(.06, .02, .02)), m3(pick([0xffffff, 0xffeb3b, 0xef9a9a]))); break;
    case 'shoe': m = new THREE.Mesh(dGeo('shoe', () => new THREE.BoxGeometry(.1, .06, .22)), m3(pick([0xfafafa, 0x1e88e5]))); break;
    case 'ball': m = new THREE.Mesh(dGeo('ball', () => new THREE.SphereGeometry(.13, 12, 10)), m3(0xff7043)); break;
    case 'bottle': m = new THREE.Mesh(dGeo('bottle', () => new THREE.CylinderGeometry(.04, .05, .24, 8)), m3(pick([0x43a047, 0x8d6e63, 0x81d4fa, 0xfafafa]), {transparent:true, opacity:.85})); m.rotation.z = Math.PI/2; break;
    case 'can': m = new THREE.Mesh(dGeo('can', () => new THREE.CylinderGeometry(.05, .05, .12, 10)), m3(pick([0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xbdbdbd]), {metalness:.5, roughness:.4})); break;
    case 'veg': m = new THREE.Mesh(dGeo('veg', () => new THREE.SphereGeometry(.08, 10, 8)), m3(pick([0xe53935, 0xff9800, 0x7cb342, 0xfdd835, 0x8e24aa]))); break;
    case 'pack': case 'snack': m = new THREE.Mesh(dGeo('pack', () => new THREE.BoxGeometry(.16, .05, .22)), m3(pick([0xff7043, 0xffca28, 0xec407a, 0x7e57c2, 0x26a69a]))); break;
    case 'box': m = new THREE.Mesh(dGeo('box', () => new THREE.BoxGeometry(.45, .35, .4)), m3(pick([0xc8a165, 0xb88c4e, 0xd1ab70]))); break;
    case 'pallet': m = new THREE.Mesh(dGeo('pallet', () => new THREE.BoxGeometry(.7, .08, .6)), m3(0x8d6e63)); break;
    case 'crate': m = new THREE.Mesh(dGeo('crate', () => new THREE.BoxGeometry(.6, .06, .5)), m3(pick([0xc62828, 0x1565c0, 0x2e7d32, 0xef6c00]), {metalness:.4})); break;
    case 'luggage': m = new THREE.Mesh(dGeo('lug', () => new THREE.BoxGeometry(.35, .22, .25)), m3(pick([0x37474f, 0x6d4c41, 0x1565c0, 0xc62828]))); break;
    case 'bag': m = new THREE.Mesh(dGeo('bag', () => new THREE.BoxGeometry(.3, .15, .12)), m3(pick([0x212121, 0x8d6e63, 0xec407a]))); break;
    case 'strap': m = new THREE.Mesh(dGeo('strap', () => new THREE.TorusGeometry(.07, .015, 6, 14)), m3(0xfff59d)); break;
    case 'wood': m = new THREE.Mesh(dGeo('wood', () => new THREE.BoxGeometry(.6, .08, .1)), m3(0x6d4c41)); break;
    case 'branch': m = new THREE.Mesh(dGeo('branch', () => new THREE.CylinderGeometry(.03, .05, .7, 6)), m3(0x6d4c41)); m.rotation.z = Math.PI/2.5; break;
    case 'leaf': m = new THREE.Mesh(dGeo('leaf', () => new THREE.SphereGeometry(.16, 8, 6)), m3(0x558b2f)); break;
    case 'soil': m = new THREE.Mesh(dGeo('soil', () => new THREE.SphereGeometry(.18, 7, 6)), m3(pick([0x795548, 0x6d4c41, 0x8d6e63]))); m.scale.y = .55; break;
    case 'basin': m = new THREE.Mesh(dGeo('basin', () => new THREE.CylinderGeometry(.16, .11, .1, 14, 1, true)), m3(0xffca28, {side: THREE.DoubleSide})); break;
    case 'bulb': m = new THREE.Mesh(dGeo('bulb', () => new THREE.SphereGeometry(.07, 8, 6)), m3(pick([0xffeb3b, 0xff4081, 0x00e5ff]), {emissive: 0x444444})); break;
    case 'toy': m = new THREE.Mesh(dGeo('toy', () => new THREE.BoxGeometry(.12, .12, .12)), m3(pick([0xe53935, 0x1e88e5, 0xfdd835, 0x43a047]))); break;
    case 'crayon': m = new THREE.Mesh(dGeo('crayon', () => new THREE.CylinderGeometry(.015, .015, .12, 6)), m3(pick([0xe53935, 0x1e88e5, 0xfdd835]))); m.rotation.z = Math.PI/2; break;
    case 'plush': m = new THREE.Mesh(dGeo('plush', () => new THREE.SphereGeometry(.12, 10, 8)), m3(pick([0xffab91, 0xce93d8, 0xa5d6a7, 0xfff59d]))); break;
    default: m = new THREE.Mesh(dGeo('stone0', () => new THREE.DodecahedronGeometry(.15)), m3(0x8d8d8d));
  }
  m.castShadow = true;
  m.rotation.y = r()*Math.PI*2;
  if (m.rotation.x === 0) m.rotation.x = (r()-.5)*.6;
  return m;
}
function debrisList(A){ return DEBRIS[A.key] || ['stone', 'panel']; }
// 天井・上空から落ちてきて、地面で止まる
function dropDebris(list, x, z, n, spread, t0, delay){
  const out = [];
  for (let i = 0; i < n; i++){
    const m = mkDebris(list[Math.floor(Math.random()*list.length)]);
    const ty = .04 + Math.random()*.06;
    m.userData = {x: x + (Math.random()-.5)*spread, z: z + (Math.random()-.5)*spread, ty, sy: 2.6 + Math.random()*1.5, d: (delay || 0) + Math.random()*.25, t0, spin: (Math.random()-.5)*8, rx: m.rotation.x};
    m.position.set(m.userData.x, m.userData.sy, m.userData.z);
    out.push(m);
  }
  return out;
}
function animDebris(list, now){
  for (const m of list){
    const u = m.userData, t = (now - u.t0)/1000 - u.d;
    if (t < 0){ m.visible = false; continue; }
    m.visible = true;
    const k = Math.min(1, t/.45);
    const bounce = k >= 1 ? Math.max(0, Math.sin((t - .45)*14)*Math.exp(-(t - .45)*8)*.12) : 0;
    m.position.set(u.x, u.sy + (u.ty - u.sy)*k*k + bounce, u.z);
    if (k < 1) m.rotation.x = u.rx + t*u.spin;
  }
}
