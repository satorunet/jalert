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
    A: { name: '本物に近いチャイム', desc: '実際の音の長さ・リズム・音域・音色に合わせた試作。1.5秒のフレーズ（速い上昇アルペジオ×2）を4回くり返す。旋律は著作物のため、音の並びは変えています。',
      play(AC, out){
        const r = room(AC, out), t0 = AC.currentTime + 0.05;
        // 実際の音：390→1320Hz あたりを5音で駆け上がるアルペジオを2つ、0.5秒ずらして。ここでは別の和音で同じ形にする
        const arp1 = [370.0, 493.9, 622.3, 880.0, 1174.7];     // F#4 B4 D#5 A5 D6
        const arp2 = [440.0, 587.3, 740.0, 1046.5, 1396.9];    // A4 D5 F#5 C6 F6
        const note = (f, t, dur, vol) => {
          tone(AC, r, f, t, dur, 'sine', vol, 0.004);
          tone(AC, r, f*2, t, dur*0.6, 'sine', vol*0.32, 0.004);     // 2倍音（実際の音にもある）
          tone(AC, r, f*3, t, dur*0.35, 'triangle', vol*0.12, 0.003);
        };
        for (let rep = 0; rep < 4; rep++){
          const tp = t0 + rep*1.5;
          arp1.forEach((f, i) => note(f, tp + i*0.1, 1.0, 0.11));
          arp2.forEach((f, i) => note(f, tp + 0.5 + i*0.1, i === 4 ? 1.3 : 1.0, 0.12));
        }
        return 6.4;
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
    D: { name: '和音型（似た響き）', desc: '試作Aと同じ「4度・3度・増4度を重ねた明るく不協和な和音」を、上にさっと鳴らしてから下へ返す形に。1.5秒のフレーズを4回。',
      play(AC, out){
        const r = room(AC, out), t0 = AC.currentTime + 0.05;
        const ch1 = [370.0, 493.9, 622.3, 880.0, 1174.7];
        const ch2 = [1396.9, 1046.5, 740.0, 587.3, 440.0];     // 2つ目は上から下へ
        const note = (f, t, dur, vol) => {
          bell(AC, r, f, t, dur, vol*0.55);
          tone(AC, r, f, t, dur, 'sine', vol, 0.004);
          tone(AC, r, f*2, t, dur*0.5, 'sine', vol*0.3, 0.004);
        };
        for (let rep = 0; rep < 4; rep++){
          const tp = t0 + rep*1.5;
          ch1.forEach((f, i) => note(f, tp + i*0.035, 1.1, 0.055));
          ch2.forEach((f, i) => note(f, tp + 0.55 + i*0.06, 1.2, 0.055));
        }
        return 6.6;
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
    A: { name: '本物に近いサイレン', desc: '実際の国民保護サイレンを分析して合わせた試作。全音ほど離れた2つの音を同時に鳴らし、うなり合う不気味な響きのまま、約6.5秒かけてゆっくり上がり、3.5秒で下がる（計10秒）。',
      play(AC, out){
        const t0 = AC.currentTime + 0.05, END = 10;
        const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.Q.value = 0.3;
        const g = AC.createGain();
        g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.13, t0 + 0.25);
        g.gain.setValueAtTime(0.13, t0 + END - 0.3); g.gain.linearRampToValueAtTime(0.0001, t0 + END);
        lp.connect(g).connect(out);
        // 低い方の音：265 → 370Hz（6.5秒）→ 300Hz（10秒）。高い方は約1.125倍（全音上）
        [1, 1.125].forEach((m, k) => {
          const o = AC.createOscillator(); o.type = 'square';
          o.frequency.setValueAtTime(265*m, t0);
          o.frequency.linearRampToValueAtTime(320*m, t0 + 2.5);
          o.frequency.linearRampToValueAtTime(370*m, t0 + 6.6);
          o.frequency.linearRampToValueAtTime(355*m, t0 + 7.6);
          o.frequency.linearRampToValueAtTime(300*m, t0 + END);
          // ごくわずかな揺らぎ（機械式サイレンらしさ）
          const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 0.7 + k*0.23; lg.gain.value = 1.5;
          lfo.connect(lg).connect(o.frequency); lfo.start(t0); lfo.stop(t0 + END + 0.1);
          const og = AC.createGain(); og.gain.value = k ? 0.9 : 1;
          o.connect(og).connect(lp); o.start(t0); o.stop(t0 + END + 0.1);
        });
        return END;
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
