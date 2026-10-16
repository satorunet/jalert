// 緊急速報シミュレーター：警報音の試作
// 実際の警報音に「似せた」別の音。すべてブラウザ（Web Audio）で合成し、録音データは使わない。
// AlertSynth.EQ / AlertSynth.MS の各 play(AC, out) は鳴らし始めて、鳴る長さ（秒）を返す。
(function(){
  'use strict';

  function tone(AC, out, f, t, dur, type, vol, attack){
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  // FM で鐘っぽい音（金属的な倍音が減衰していく）
  function bell(AC, out, f, t, dur, vol){
    const car = AC.createOscillator(), mod = AC.createOscillator(), mg = AC.createGain(), g = AC.createGain();
    car.frequency.value = f; mod.frequency.value = f * 3.51;
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur);
    mod.connect(mg).connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(g).connect(out);
    car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  }
  // 軽い残響（短いディレイの重ね）
  function room(AC, out){
    const input = AC.createGain(), dry = AC.createGain(), wet = AC.createGain();
    dry.gain.value = 1; wet.gain.value = 0.28;
    input.connect(dry).connect(out);
    for (const [dt, fb] of [[0.067, 0.35], [0.113, 0.3], [0.171, 0.25]]){
      const d = AC.createDelay(1), f = AC.createGain(), lp = AC.createBiquadFilter();
      d.delayTime.value = dt; f.gain.value = fb; lp.type = 'lowpass'; lp.frequency.value = 3500;
      input.connect(d); d.connect(lp).connect(f).connect(d); lp.connect(wet);
    }
    wet.connect(out);
    return input;
  }

  // ===== 緊急地震速報風 =====
  const EQ = {
    A: { name: '鐘型チャイム', desc: '不協和の2和音を素早く交互に鳴らす、注意を引く金属的なチャイム。2回くり返す。',
      play(AC, out){
        const r = room(AC, out), t0 = AC.currentTime + 0.05;
        const p1 = [987.77, 1396.91], p2 = [1046.5, 1479.98];     // B5+F6 / C6+F#6（三全音）
        for (let rep = 0; rep < 2; rep++) for (let i = 0; i < 12; i++){
          const tt = t0 + rep*2.3 + i*0.135;
          (i % 2 ? p2 : p1).forEach(f => bell(AC, r, f, tt, 0.9, 0.1));
        }
        return 4.7;
      } },
    B: { name: '上昇アルペジオ', desc: '5音が駆け上がるフレーズを3回。最後の音を長く伸ばして緊張感を出す。',
      play(AC, out){
        const r = room(AC, out), t0 = AC.currentTime + 0.05;
        const notes = [880, 1108.73, 1318.51, 1661.22, 1975.53];
        for (let rep = 0; rep < 2; rep++) for (let k = 0; k < 3; k++) notes.forEach((f, i) => {
          const tt = t0 + rep*2.6 + k*0.62 + i*0.085;
          const last = i === notes.length - 1;
          tone(AC, r, f, tt, last ? 0.7 : 0.3, 'square', 0.1);
          tone(AC, r, f*2, tt, last ? 0.5 : 0.18, 'triangle', 0.06);
        });
        return 5.0;
      } },
    C: { name: '携帯の緊急速報風', desc: '2つの高い音を高速で交互に鳴らすピロピロ音を、1秒ずつ3回。',
      play(AC, out){
        const t0 = AC.currentTime + 0.05;
        for (let b = 0; b < 3; b++){
          const tb = t0 + b*1.35;
          const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter();
          o.type = 'square'; o2.type = 'sine'; lp.type = 'lowpass'; lp.frequency.value = 4200;
          for (let k = 0; k < 12; k++){
            const f = k % 2 ? 1318.51 : 1046.5;
            o.frequency.setValueAtTime(f, tb + k*0.083); o2.frequency.setValueAtTime(f*2, tb + k*0.083);
          }
          g.gain.setValueAtTime(0.0001, tb); g.gain.linearRampToValueAtTime(0.09, tb + 0.01);
          g.gain.setValueAtTime(0.09, tb + 0.98); g.gain.linearRampToValueAtTime(0.0001, tb + 1.0);
          o.connect(lp); o2.connect(lp); lp.connect(g).connect(out);
          o.start(tb); o2.start(tb); o.stop(tb + 1.05); o2.stop(tb + 1.05);
        }
        return 4.1;
      } },
  };

  // ===== ミサイル発射情報（国民保護サイレン）風 =====
  function sirenVoice(AC, out, t0, sweeps, opt){
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = opt.lp || 2400;
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(opt.vol, t0 + 0.5);
    lp.connect(g).connect(out);
    const end = t0 + sweeps.reduce((a, s) => a + s.dur, 0);
    g.gain.setValueAtTime(opt.vol, end - 0.6); g.gain.linearRampToValueAtTime(0.0001, end);
    (opt.mult || [1]).forEach((m, k) => {
      const o = AC.createOscillator(); o.type = opt.type || 'sawtooth';
      let t = t0; o.frequency.setValueAtTime(sweeps[0].from * m, t);
      for (const s of sweeps){ o.frequency.setValueAtTime(s.from * m, t); o.frequency.linearRampToValueAtTime(s.to * m, t + s.dur); t += s.dur; }
      if (opt.warble){
        const lfo = AC.createOscillator(), lg = AC.createGain();
        lfo.frequency.value = opt.warble; lg.gain.value = opt.depth * m;
        lfo.connect(lg).connect(o.frequency); lfo.start(t0); lfo.stop(end + 0.1);
      }
      const og = AC.createGain(); og.gain.value = k ? 0.45 : 1;
      o.connect(og).connect(lp); o.start(t0); o.stop(end + 0.1);
    });
    return end - t0;
  }
  const MS = {
    A: { name: 'うなりサイレン', desc: 'ゆっくり上がって伸び、下がる音に細かい「ふるえ」をのせた、国民保護サイレンに似た不気味な音。',
      play(AC, out){
        const t0 = AC.currentTime + 0.05, sw = [];
        for (let i = 0; i < 3; i++) sw.push({from: 430, to: 760, dur: 1.6}, {from: 760, to: 790, dur: 1.2}, {from: 790, to: 420, dur: 1.5});
        return sirenVoice(AC, out, t0, sw, {vol: 0.16, warble: 6.5, depth: 22, mult: [1, 1.335], type: 'sawtooth', lp: 2200});
      } },
    B: { name: 'モーターサイレン', desc: '大きく上下にうなる、昔ながらの手回し・モーター式サイレンのような音。',
      play(AC, out){
        const t0 = AC.currentTime + 0.05, sw = [];
        for (let i = 0; i < 3; i++) sw.push({from: 280, to: 760, dur: 1.9}, {from: 760, to: 760, dur: 0.5}, {from: 760, to: 300, dur: 1.6});
        return sirenVoice(AC, out, t0, sw, {vol: 0.17, mult: [1, 1.26], type: 'sawtooth', lp: 1900});
      } },
    C: { name: '高低交互サイレン', desc: '高い音と低い音を0.5秒ずつ交互にくり返す、切迫した警報音。',
      play(AC, out){
        const t0 = AC.currentTime + 0.05, sw = [];
        for (let i = 0; i < 9; i++) sw.push({from: 940, to: 940, dur: 0.5}, {from: 620, to: 620, dur: 0.5});
        return sirenVoice(AC, out, t0, sw, {vol: 0.12, mult: [1, 1.5], type: 'square', lp: 2600, warble: 14, depth: 6});
      } },
  };

  window.AlertSynth = { EQ, MS };
})();
