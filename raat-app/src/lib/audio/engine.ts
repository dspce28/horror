'use client';
// Every sound is synthesised with the Web Audio API, so there are no licensing questions.
// Nothing plays until the visitor clicks "Enter the darkness".

type Pt = [number, number];

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  music!: GainNode;
  rev!: ConvolverNode;
  noise!: AudioBuffer;
  muted = false;
  volume = .8;
  safe = false;
  private bed: { out: GainNode; drone: GainNode; o2: OscillatorNode } | null = null;
  private engine: { out: GainNode; o: OscillatorNode; o2: OscillatorNode; lp: BiquadFilterNode } | null = null;
  private buzz: { out: GainNode } | null = null;
  private heartTimer = 0;
  private heartRate = 0;
  private ringTimer = 0;
  private comedyTimer = 0;
  private themeGain: GainNode | null = null;

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    try { this.ctx = new C(); } catch { return; }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(c.destination);
    this.music = c.createGain(); this.music.gain.value = 1; this.music.connect(this.master);
    const len = c.sampleRate * 2; this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const irLen = Math.floor(c.sampleRate * 3), ir = c.createBuffer(2, irLen, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const x = ir.getChannelData(ch); for (let i = 0; i < irLen; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.2); }
    this.rev = c.createConvolver(); this.rev.buffer = ir;
    const rl = c.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 3000;
    this.rev.connect(rl); rl.connect(this.master);
  }

  get ok() { return !!this.ctx; }
  private get now() { return this.ctx!.currentTime; }
  private src() { const s = this.ctx!.createBufferSource(); s.buffer = this.noise; s.loop = true; return s; }
  private out(node: AudioNode, pan = 0, wet = .3, dest: AudioNode = this.master) {
    const c = this.ctx!; let n: AudioNode = node;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); node.connect(p); n = p; }
    n.connect(dest);
    if (wet > 0) { const w = c.createGain(); w.gain.value = wet; n.connect(w); w.connect(this.rev); }
  }
  private env(g: GainNode, at: number, pts: Pt[]) { g.gain.setValueAtTime(0, at); pts.forEach(([dt, v]) => g.gain.linearRampToValueAtTime(v, at + dt)); }

  setVolume(v: number) { this.volume = v; if (this.ok && !this.muted) this.master.gain.setTargetAtTime(v, this.now, .05); }
  setMuted(m: boolean) { this.muted = m; if (this.ok) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.now, .05); }

  /* ---------- continuous layers ---------- */
  startBed() {
    if (!this.ok || this.bed) return; const c = this.ctx!;
    const out = c.createGain(); out.gain.value = 0; out.gain.setTargetAtTime(1, c.currentTime, 2); out.connect(this.music);
    const wind = (f: number, q: number, amt: number, rate: number) => {
      const w = this.src(), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; g.gain.value = amt;
      const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = rate; lg.gain.value = amt * .9; l.connect(lg); lg.connect(g.gain);
      w.connect(bp); bp.connect(g); g.connect(out); w.start(0, Math.random()); l.start();
    };
    wind(320, .8, .1, .07); wind(900, 4, .04, .11); wind(1700, 9, .02, .05);
    const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 120; dl.Q.value = 5;
    const o1 = c.createOscillator(), o2 = c.createOscillator(); o1.type = o2.type = 'sawtooth'; o1.frequency.value = 43; o2.frequency.value = 43.4;
    const drone = c.createGain(); drone.gain.value = .03; o1.connect(dl); o2.connect(dl); dl.connect(drone); drone.connect(out); o1.start(); o2.start();
    this.bed = { out, drone, o2 };
  }
  /** 0 calm … 1 terror */
  dread(l: number) { if (!this.bed) return; this.bed.drone.gain.setTargetAtTime(.025 + l * .035, this.now, 1.5); this.bed.o2.frequency.setTargetAtTime(43.4 + l * .9, this.now, 1.5); }
  bedLevel(v: number, t = 1) { if (this.bed) this.bed.out.gain.setTargetAtTime(v, this.now, t); }

  /** bus engine: level 0–1, rpm 0–1 */
  setEngine(level: number, rpm = .3) {
    if (!this.ok) return; const c = this.ctx!;
    if (!this.engine) {
      if (level <= 0) return;
      const out = c.createGain(); out.gain.value = 0; out.connect(this.master);
      const o = c.createOscillator(), o2 = c.createOscillator(); o.type = 'sawtooth'; o2.type = 'square';
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 2;
      const g2 = c.createGain(); g2.gain.value = .35;
      const n = this.src(), nb = c.createBiquadFilter(), ng = c.createGain(); nb.type = 'lowpass'; nb.frequency.value = 400; ng.gain.value = .25;
      o.connect(lp); o2.connect(g2); g2.connect(lp); n.connect(nb); nb.connect(ng); ng.connect(lp); lp.connect(out);
      o.start(); o2.start(); n.start();
      this.engine = { out, o, o2, lp };
    }
    const e = this.engine, f = 32 + rpm * 38;
    e.out.gain.setTargetAtTime(level * .22, this.now, .4);
    e.o.frequency.setTargetAtTime(f, this.now, .5); e.o2.frequency.setTargetAtTime(f * .5, this.now, .5);
    e.lp.frequency.setTargetAtTime(180 + rpm * 420, this.now, .5);
  }

  /** fluorescent tube hum, 0–1 */
  setBuzz(level: number) {
    if (!this.ok) return; const c = this.ctx!;
    if (!this.buzz) {
      if (level <= 0) return;
      const out = c.createGain(); out.gain.value = 0; out.connect(this.master);
      const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 100;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 1;
      const g = c.createGain(); g.gain.value = .02; o.connect(bp); bp.connect(g); g.connect(out); o.start();
      this.buzz = { out };
    }
    this.buzz.out.gain.setTargetAtTime(level, this.now, .05);
  }

  /** heartbeats per minute, 0 stops */
  setHeart(bpm: number) {
    this.heartRate = bpm;
    if (bpm <= 0) { window.clearTimeout(this.heartTimer); this.heartTimer = 0; return; }
    if (this.heartTimer) return;
    const beat = () => {
      if (this.heartRate <= 0) { this.heartTimer = 0; return; }
      this.heartbeat(.35 + Math.min(.4, (this.heartRate - 60) / 200));
      this.heartTimer = window.setTimeout(beat, 60000 / this.heartRate);
    };
    beat();
  }

  /* ---------- theme music (optional file) ---------- */
  loadTheme(url: string) {
    if (!this.ok || this.themeGain) return;
    const c = this.ctx!;
    const g = c.createGain(); g.gain.value = 0; g.connect(this.music); this.themeGain = g;
    fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((b) => c.decodeAudioData(b)).then((buf) => {
      const d = buf.getChannelData(0); let a = 0, z = d.length - 1; while (a < d.length && Math.abs(d[a]) < .004) a++; while (z > a && Math.abs(d[z]) < .004) z--;
      const start = a / buf.sampleRate, len = (z - a) / buf.sampleRate, xf = Math.min(2.5, len / 6);
      const play = (at: number) => {
        const s = c.createBufferSource(), sg = c.createGain(); s.buffer = buf; s.connect(sg); sg.connect(g);
        sg.gain.setValueAtTime(0, at); sg.gain.linearRampToValueAtTime(1, at + xf); sg.gain.setValueAtTime(1, at + len - xf); sg.gain.linearRampToValueAtTime(0, at + len);
        s.start(at, start, len); const next = at + len - xf;
        window.setTimeout(() => play(next), Math.max(0, (next - c.currentTime - 1) * 1000));
      };
      play(c.currentTime + .05);
    }).catch(() => {});
  }
  themeLevel(v: number, t = 1.2) { if (this.themeGain) this.themeGain.gain.setTargetAtTime(v, this.now, t); }
  /** horror music fades away completely */
  silence() { if (!this.ok) return; this.music.gain.cancelScheduledValues(this.now); this.music.gain.setTargetAtTime(0, this.now, .08); this.setHeart(0); this.setBuzz(0); }
  restoreMusic() { if (this.ok) this.music.gain.setTargetAtTime(1, this.now, 1); }

  /** a cheerful dhol-and-harmonium loop for the twist */
  startComedy() {
    if (!this.ok || this.comedyTimer) return;
    const c = this.ctx!; const bar = 1.6; let t0 = c.currentTime + .05;
    const notes = [67, 69, 71, 72, 71, 69, 67, 64];
    const play = () => {
      for (let i = 0; i < 8; i++) {
        const at = t0 + i * bar / 8;
        if (i % 2 === 0) this.drum(at, i % 4 === 0 ? 70 : 110, i % 4 === 0 ? .45 : .25);
        const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
        o.type = 'sawtooth'; o2.type = 'sawtooth'; const f = 440 * Math.pow(2, (notes[i] - 69) / 12); o.frequency.value = f; o2.frequency.value = f * 1.004;
        lp.type = 'lowpass'; lp.frequency.value = 1800; this.env(g, at, [[.02, .05], [bar / 8 - .03, .035], [bar / 8, 0]]);
        o.connect(lp); o2.connect(lp); lp.connect(g); this.out(g, .1, .15); o.start(at); o2.start(at); o.stop(at + bar / 8 + .05); o2.stop(at + bar / 8 + .05);
      }
      t0 += bar;
      this.comedyTimer = window.setTimeout(play, Math.max(0, (t0 - c.currentTime - .4) * 1000));
    };
    play();
  }
  stopComedy() { window.clearTimeout(this.comedyTimer); this.comedyTimer = 0; }
  private drum(at: number, f: number, v: number) {
    const c = this.ctx!, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(f * 1.6, at); o.frequency.exponentialRampToValueAtTime(f, at + .08);
    g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(v, at + .005); g.gain.exponentialRampToValueAtTime(.0001, at + .3);
    o.connect(g); this.out(g, 0, .1); o.start(at); o.stop(at + .32);
  }

  /* ---------- one-shots ---------- */
  thump(v = .6, f = 90) {
    if (!this.ok) return; const c = this.ctx!, t = this.now, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .42, t + .2);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .6);
    o.connect(g); this.out(g, 0, .15); o.start(t); o.stop(t + .65);
  }
  heartbeat(v = .5) { this.thump(v, 60); window.setTimeout(() => this.thump(v * .7, 55), 200); }

  whisper(pan = 0, v = 1) {
    if (!this.ok) return; const c = this.ctx!, t0 = this.now, n = this.src(), bp = c.createBiquadFilter(), bp2 = c.createBiquadFilter(), g = c.createGain();
    bp.type = 'bandpass'; bp.Q.value = 3; bp2.type = 'bandpass'; bp2.frequency.value = 5200; bp2.Q.value = 2;
    g.gain.setValueAtTime(0, t0); let t = t0;
    for (let i = 0; i < 12; i++) { const d = .06 + Math.random() * .14; g.gain.linearRampToValueAtTime((.13 + Math.random() * .15) * v, t + d * .35); g.gain.linearRampToValueAtTime(.008, t + d); bp.frequency.setValueAtTime(1500 + Math.random() * 2000, t); t += d + (i % 4 === 3 ? .18 : 0); }
    g.gain.linearRampToValueAtTime(0, t + .1); n.connect(bp); n.connect(bp2); bp.connect(g); bp2.connect(g);
    this.out(g, pan, .5); n.start(t0, Math.random()); n.stop(t + .2);
  }
  breath() {
    if (!this.ok) return; const c = this.ctx!; let t = this.now;
    for (let i = 0; i < 2; i++) {
      ([[950, .7, .12], [620, 1, .15]] as [number, number, number][]).forEach(([f, d, v]) => {
        const n = this.src(), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = .9;
        this.env(g, t, [[d * .4, v], [d, 0]]); n.connect(bp); bp.connect(g); this.out(g, .3, .05); n.start(t, Math.random()); n.stop(t + d + .05); t += d + .1;
      });
      t += .4;
    }
  }
  ping() {
    if (!this.ok) return; const c = this.ctx!, t = this.now;
    ([[0, 1318], [.11, 1760]] as Pt[]).forEach(([d, f]) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; this.env(g, t + d, [[.008, .12], [.35, 0]]); o.connect(g); this.out(g, 0, .05); o.start(t + d); o.stop(t + d + .4); });
  }
  bark() {
    if (!this.ok) return; const c = this.ctx!;
    [0, .32, 1.4].forEach((d, i) => {
      const t = this.now + d, o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter(), n = this.src(), ng = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(180, t + .14);
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.5; this.env(g, t, [[.01, .09 / (i + 1)], [.15, 0]]); this.env(ng, t, [[.005, .05 / (i + 1)], [.08, 0]]);
      o.connect(bp); n.connect(ng); ng.connect(bp); bp.connect(g); this.out(g, -.7, .9); o.start(t); o.stop(t + .2); n.start(t, Math.random()); n.stop(t + .12);
    });
  }
  brake() {
    if (!this.ok) return; const c = this.ctx!, t = this.now;
    const o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(2300, t); o.frequency.linearRampToValueAtTime(1900, t + 1.2);
    bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 8; this.env(g, t, [[.1, .05], [1, .04], [1.3, 0]]); o.connect(bp); bp.connect(g); this.out(g, -.2, .3); o.start(t); o.stop(t + 1.4);
    this.hiss(t + 1.2, .5);
  }
  private hiss(at: number, v: number) {
    const c = this.ctx!, n = this.src(), hp = c.createBiquadFilter(), g = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 3000;
    this.env(g, at, [[.03, v * .25], [.9, 0]]); n.connect(hp); hp.connect(g); this.out(g, .2, .2); n.start(at, Math.random()); n.stop(at + 1);
  }
  door() { if (!this.ok) return; this.hiss(this.now, .7); window.setTimeout(() => this.thump(.45, 120), 450); }
  step(v = .35, pan = 0) {
    if (!this.ok) return; const c = this.ctx!, t = this.now, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(50, t + .1); this.env(g, t, [[.005, v], [.16, 0]]); o.connect(g); this.out(g, pan, .3); o.start(t); o.stop(t + .2);
  }
  steps(n = 3) { for (let i = 0; i < n; i++) window.setTimeout(() => this.step(.35, i % 2 ? .2 : -.2), i * 380); }
  thunder() {
    if (!this.ok) return; const c = this.ctx!, t = this.now, n = this.src(), lp = c.createBiquadFilter(), g = c.createGain();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(90, t + 3.5);
    this.env(g, t, [[.05, .5], [.4, .35], [1.2, .45], [3.8, 0]]); n.connect(lp); lp.connect(g); this.out(g, -.3, .6); n.start(t); n.stop(t + 4);
  }
  crack() {
    if (!this.ok) return; const c = this.ctx!, t0 = this.now;
    for (let i = 0; i < 14; i++) { const at = t0 + Math.random() * .6, o = c.createOscillator(), g = c.createGain(); o.frequency.value = 2500 + Math.random() * 5000; g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(.06, at + .002); g.gain.exponentialRampToValueAtTime(.0001, at + .18); o.connect(g); this.out(g, Math.random() * 2 - 1, .4); o.start(at); o.stop(at + .2); }
  }
  /** her scream: kept short and capped, quieter in safe mode */
  shriek(v = 1) {
    if (!this.ok) return; const c = this.ctx!, t = this.now, k = this.safe ? .35 : v;
    const ws = c.createWaveShaper(), curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) curve[i] = Math.tanh((i / 512 - 1) * 4); ws.curve = curve;
    const g = c.createGain(); g.gain.setValueAtTime(.7 * k, t); g.gain.setValueAtTime(.7 * k, t + .7); g.gain.exponentialRampToValueAtTime(.001, t + 1.5); ws.connect(g); this.out(g, 0, .5);
    const voice = c.createOscillator(); voice.type = 'sawtooth'; voice.frequency.setValueAtTime(620, t); voice.frequency.linearRampToValueAtTime(1100, t + .12); voice.frequency.linearRampToValueAtTime(900, t + 1.4);
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 8; vg.gain.value = 40; vib.connect(vg); vg.connect(voice.frequency);
    ([[1000, 1], [1600, .7], [3100, .5]] as Pt[]).forEach(([f, a]) => { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 5; const ag = c.createGain(); ag.gain.value = a * 1.3; voice.connect(bp); bp.connect(ag); ag.connect(ws); });
    voice.start(t); vib.start(t); voice.stop(t + 1.6); vib.stop(t + 1.6);
  }
  hit() { if (!this.ok) return; this.thump(this.safe ? .3 : .9, 70); this.crack(); }
  glitch() {
    if (!this.ok) return; const c = this.ctx!, t = this.now, n = this.src(), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = .5;
    for (let i = 0; i < 8; i++) g.gain.setValueAtTime(Math.random() * .25, t + i * .07); g.gain.setValueAtTime(0, t + .6); n.connect(bp); bp.connect(g); g.connect(this.master); n.start(t); n.stop(t + .65);
  }
  /** a woman's low laugh: pulses of a voiced vowel falling in pitch */
  laugh() {
    if (!this.ok) return; const c = this.ctx!; let t = this.now + .05;
    const o = c.createOscillator(); o.type = 'sawtooth'; const g = c.createGain(); g.gain.value = 0;
    ([[700, 1], [1200, .5], [2600, .2]] as Pt[]).forEach(([f, a]) => { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 8; const ag = c.createGain(); ag.gain.value = a * 2.5; o.connect(bp); bp.connect(ag); ag.connect(g); });
    for (let i = 0; i < 7; i++) { const f = 330 - i * 14; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .04); g.gain.linearRampToValueAtTime(0, t + .17); t += .2 + i * .015; }
    this.out(g, .4, 1); o.start(); o.stop(t + .2);
  }
  burn() {
    if (!this.ok) return; const c = this.ctx!, t0 = this.now;
    const n = this.src(), lp = c.createBiquadFilter(), g = c.createGain(); lp.type = 'lowpass'; lp.frequency.value = 700; this.env(g, t0, [[.6, .18], [3, .12], [4, 0]]); n.connect(lp); lp.connect(g); this.out(g, 0, .2); n.start(t0); n.stop(t0 + 4.1);
    for (let i = 0; i < 40; i++) { const at = t0 + Math.random() * 3.6, o = this.src(), hp = c.createBiquadFilter(), cg = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 2000; this.env(cg, at, [[.002, .12 * Math.random()], [.03, 0]]); o.connect(hp); hp.connect(cg); this.out(cg, Math.random() - .5, .1); o.start(at, Math.random()); o.stop(at + .04); }
  }
  /** phone ringtone loop */
  startRing() {
    if (!this.ok || this.ringTimer) return; const c = this.ctx!;
    const once = () => {
      let t = c.currentTime;
      for (let r = 0; r < 2; r++) { ([[0, 880], [.12, 1175], [.24, 880], [.36, 1175]] as Pt[]).forEach(([d, f]) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; this.env(g, t + d, [[.01, .1], [.1, 0]]); o.connect(g); this.out(g, .2, .1); o.start(t + d); o.stop(t + d + .12); }); t += .7; }
      this.ringTimer = window.setTimeout(once, 2600);
    };
    once();
  }
  stopRing() { window.clearTimeout(this.ringTimer); this.ringTimer = 0; }
  chime() {
    if (!this.ok) return; const c = this.ctx!, t = this.now;
    [523, 659, 784, 1046].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; this.env(g, t + i * .09, [[.01, .08], [.6, 0]]); o.connect(g); this.out(g, 0, .4); o.start(t + i * .09); o.stop(t + i * .09 + .7); });
  }
}

export const audio = new AudioEngine();
