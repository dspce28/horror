'use client';
// The audio director. Effects and atmosphere are synthesised with the Web Audio API (no licensing questions);
// character voices are audio files (see lib/audio/voice.ts). Nothing plays until the visitor presses Begin.
//
// Buses:  ambience (bed, rain, engine, tube hum, insects) ─┐
//         music (theme) ─────────────────────────────────┼─ mood (music & atmosphere volume) ─ duck ─┐
//         one-shot effects ───────────────────────────────────────────────────────────────────────┼─ master ─ compressor ─ out
//         dialogue (voice volume) ─────────────────────────────────────────────────────────────────┘
// When a character speaks, `duck` lowers music and atmosphere and brings them back slowly afterwards.

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
  private themeGain: GainNode | null = null;
  amb!: GainNode;
  private mood!: GainNode;
  private duckG!: GainNode;
  dlg!: GainNode;
  fx!: GainNode;
  moodVolume = 1;
  voiceVolume = 1;
  /** the line being spoken right now (one at a time, never two voices over each other) */
  private speaking: { src: AudioBufferSourceNode; g: GainNode } | null = null;
  private insects: { out: GainNode } | null = null;
  private bike: { out: GainNode; o: OscillatorNode; lp: BiquadFilterNode } | null = null;
  private line: { out: GainNode } | null = null;

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
    this.duckG = c.createGain(); this.duckG.connect(this.master);
    this.mood = c.createGain(); this.mood.gain.value = this.moodVolume; this.mood.connect(this.duckG);
    this.music = c.createGain(); this.music.gain.value = 1; this.music.connect(this.mood);
    this.amb = c.createGain(); this.amb.connect(this.mood);
    this.dlg = c.createGain(); this.dlg.gain.value = this.voiceVolume; this.dlg.connect(this.master);
    this.fx = c.createGain(); this.fx.gain.value = 1.6; this.fx.connect(this.master);          // horror effects: loud
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
  private out(node: AudioNode, pan = 0, wet = .3, dest: AudioNode = this.fx) {
    const c = this.ctx!; let n: AudioNode = node;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); node.connect(p); n = p; }
    n.connect(dest);
    if (wet > 0) { const w = c.createGain(); w.gain.value = wet; n.connect(w); w.connect(this.rev); }
  }
  private env(g: GainNode, at: number, pts: Pt[]) { g.gain.setValueAtTime(0, at); pts.forEach(([dt, v]) => g.gain.linearRampToValueAtTime(v, at + dt)); }

  setVolume(v: number) { this.volume = v; if (this.ok && !this.muted) this.master.gain.setTargetAtTime(v, this.now, .05); }
  setMuted(m: boolean) { this.muted = m; if (this.ok) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.now, .05); }
  /** music and atmosphere, 0–1 */
  setMoodVolume(v: number) { this.moodVolume = v; if (this.ok) this.mood.gain.setTargetAtTime(v, this.now, .05); }
  /** character voices, 0–1 */
  setVoiceVolume(v: number) { this.voiceVolume = v; if (this.ok) this.dlg.gain.setTargetAtTime(v, this.now, .05); }
  /** lower music and atmosphere under a spoken line; bring them back slowly afterwards */
  duck(on: boolean) { if (this.ok) this.duckG.gain.setTargetAtTime(on ? .32 : 1, this.now, on ? .12 : .9); }

  /* ---------- voices ---------- */
  /**
   * Speak one line. Stops the previous line first (with a short fade), ducks the mix, places the voice
   * (behind the listener, left/right, or through a phone), and resolves with its length in seconds.
   */
  speak(buf: AudioBuffer, o: { from?: number | 'behind'; phone?: boolean; whisper?: boolean; gain?: number } = {}): number {
    if (!this.ok) return 0; const c = this.ctx!;
    this.hush();
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(o.gain ?? 1, this.now + .04);
    let n: AudioNode = src;
    if (o.phone) {
      // a phone line: 300–3400 Hz, a little saturation
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3300;
      const pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1700; pk.gain.value = 5;
      const ws = c.createWaveShaper(); const cv = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * 1.8); } ws.curve = cv;
      n.connect(hp); hp.connect(lp); lp.connect(pk); pk.connect(ws); n = ws;
    }
    n.connect(g);
    if (o.from === 'behind' && c.createPanner) {
      // just behind the listener's shoulder (the listener faces -z; +z is behind)
      const p = c.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = .3;
      p.positionX.value = .22; p.positionY.value = .05; p.positionZ.value = .45; g.connect(p); p.connect(this.dlg);
    } else if (typeof o.from === 'number' && c.createStereoPanner) {
      const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.from)); g.connect(p); p.connect(this.dlg);
    } else g.connect(this.dlg);
    // a whisper gets a touch of the bus around it; a phone voice and a close voice stay dry
    if (o.whisper && !o.phone) { const w = c.createGain(); w.gain.value = .12; g.connect(w); w.connect(this.rev); }
    src.start();
    this.speaking = { src, g };
    this.duck(true);
    src.onended = () => { if (this.speaking?.src === src) { this.speaking = null; this.duck(false); } };
    return buf.duration;
  }
  /** stop the current line quickly (no two voices at once) */
  hush() {
    const sp = this.speaking; if (!sp || !this.ok) return;
    sp.g.gain.cancelScheduledValues(this.now); sp.g.gain.setTargetAtTime(0, this.now, .04);
    try { sp.src.stop(this.now + .15); } catch { /* already stopped */ }
    this.speaking = null; this.duck(false);
  }
  get isSpeaking() { return !!this.speaking; }

  /* ---------- continuous layers ---------- */
  startBed() {
    if (!this.ok || this.bed) return; const c = this.ctx!;
    const out = c.createGain(); out.gain.value = 0; out.gain.setTargetAtTime(1, c.currentTime, 2); out.connect(this.amb);
    const wind = (f: number, q: number, amt: number, rate: number) => {
      const w = this.src(), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; g.gain.value = amt;
      const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = rate; lg.gain.value = amt * .9; l.connect(lg); lg.connect(g.gain);
      w.connect(bp); bp.connect(g); g.connect(out); w.start(0, Math.random()); l.start();
    };
    wind(320, .8, .17, .07); wind(900, 4, .07, .11); wind(1700, 9, .035, .05); wind(180, .6, .12, .03); // wind, with slow gusts
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
      const out = c.createGain(); out.gain.value = 0; out.connect(this.amb);
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
      const out = c.createGain(); out.gain.value = 0; out.connect(this.amb);
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
  /** a roll of thunder; v 1 = close and heavy, lower = further away (and muffled, e.g. heard from inside the bus) */
  thunder(v = 1) {
    if (!this.ok) return; const c = this.ctx!, t = this.now, n = this.src(), lp = c.createBiquadFilter(), g = c.createGain();
    const len = 3.5 + Math.random() * 2, pan = Math.random() * 1.4 - .7;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(400 + v * 900, t); lp.frequency.exponentialRampToValueAtTime(70, t + len);
    const a = .65 * v;
    this.env(g, t, [[.04, a], [.35, a * .55], [.9, a * .85], [1.6, a * .5], [len, 0]]); n.connect(lp); lp.connect(g); this.out(g, pan, .7); n.start(t, Math.random()); n.stop(t + len + .1);
    // the low rumble underneath
    const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(42, t); o.frequency.exponentialRampToValueAtTime(28, t + len);
    this.env(og, t, [[.1, .35 * v], [len * .7, .2 * v], [len, 0]]); o.connect(og); this.out(og, 0, 0); o.start(t); o.stop(t + len + .1);
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
  hit() { if (!this.ok) return; this.thump(this.safe ? .3 : .9, 70); this.glitch(); }
  glitch() {
    if (!this.ok) return; const c = this.ctx!, t = this.now, n = this.src(), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = .5;
    for (let i = 0; i < 8; i++) g.gain.setValueAtTime(Math.random() * .25, t + i * .07); g.gain.setValueAtTime(0, t + .6); n.connect(bp); bp.connect(g); g.connect(this.fx); n.start(t); n.stop(t + .65);
  }
  /** a woman's low laugh: pulses of a voiced vowel falling in pitch */

  burn() {
    if (!this.ok) return; const c = this.ctx!, t0 = this.now;
    const n = this.src(), lp = c.createBiquadFilter(), g = c.createGain(); lp.type = 'lowpass'; lp.frequency.value = 700; this.env(g, t0, [[.6, .18], [3, .12], [4, 0]]); n.connect(lp); lp.connect(g); this.out(g, 0, .2); n.start(t0); n.stop(t0 + 4.1);
    for (let i = 0; i < 40; i++) { const at = t0 + Math.random() * 3.6, o = this.src(), hp = c.createBiquadFilter(), cg = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 2000; this.env(cg, at, [[.002, .12 * Math.random()], [.03, 0]]); o.connect(hp); hp.connect(cg); this.out(cg, Math.random() - .5, .1); o.start(at, Math.random()); o.stop(at + .04); }
  }
  /** a distant bus horn: two detuned reeds, far away in the fog */
  horn(v = .5) {
    if (!this.ok) return; const c = this.ctx!, t = this.now;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = c.createGain(); this.env(g, t, [[.08, .07 * v], [.9, .06 * v], [1.4, 0]]);
    [233, 277].forEach((f) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * .985, t + 1.4); o.connect(lp); o.start(t); o.stop(t + 1.5); });
    lp.connect(g); this.out(g, -.4, 1.2);
  }
  /** a phone vibrating on a hard surface */
  vibrate(times = 2) {
    if (!this.ok) return; const c = this.ctx!; let t = this.now;
    for (let i = 0; i < times; i++) {
      const o = c.createOscillator(), g = c.createGain(), am = c.createOscillator(), ag = c.createGain();
      o.type = 'square'; o.frequency.value = 150; am.frequency.value = 33; ag.gain.value = .5; am.connect(ag); ag.connect(g.gain);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
      this.env(g, t, [[.02, .09], [.42, .08], [.46, 0]]); o.connect(lp); lp.connect(g); this.out(g, .25, .05);
      o.start(t); am.start(t); o.stop(t + .5); am.stop(t + .5); t += .75;
    }
  }
  /** metal or a seat creaking */
  creak(v = .5, pan = 0) {
    if (!this.ok) return; const c = this.ctx!, t = this.now;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70 + Math.random() * 30, t); o.frequency.linearRampToValueAtTime(42, t + 1.6);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 9; bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(380, t + 1.6);
    const am = c.createOscillator(), amg = c.createGain(), vg = c.createGain(); am.frequency.value = 15 + Math.random() * 6; amg.gain.value = .5; vg.gain.value = .5; am.connect(amg); amg.connect(vg.gain);
    const g = c.createGain(); this.env(g, t, [[.15, .25 * v], [1.2, .18 * v], [1.7, 0]]);
    o.connect(bp); bp.connect(vg); vg.connect(g); this.out(g, pan, .6); o.start(t); am.start(t); o.stop(t + 1.8); am.stop(t + 1.8);
  }
  /** an uneven heartbeat that skips */
  irregularHeart(beats = 6) {
    if (!this.ok) return; let at = 0;
    for (let i = 0; i < beats; i++) { const d = at; window.setTimeout(() => this.heartbeat(.32 + Math.random() * .1), d); at += 700 + Math.random() * 600 + (Math.random() < .25 ? 700 : 0); }
  }
  /** the bus door folding shut */
  doorClose() { if (!this.ok) return; this.hiss(this.now, .5); window.setTimeout(() => { this.thump(.6, 85); this.creak(.25, .3); }, 380); }
  /** footsteps on ribbed metal steps */
  stepsMetal(n = 3) {
    if (!this.ok) return; const c = this.ctx!;
    for (let i = 0; i < n; i++) window.setTimeout(() => {
      this.step(.4, i % 2 ? .15 : -.15);
      const t = this.now, n2 = this.src(), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 6;
      this.env(g, t, [[.003, .12], [.12, 0]]); n2.connect(bp); bp.connect(g); this.out(g, 0, .4); n2.start(t, Math.random()); n2.stop(t + .14);
    }, i * 520);
  }
  /** rain against the windows, a soft patter layer (0 stops) */
  private rainNode: { out: GainNode } | null = null;
  setRain(level: number) {
    if (!this.ok) return; const c = this.ctx!;
    if (!this.rainNode) {
      if (level <= 0) return;
      const out = c.createGain(); out.gain.value = 0; out.connect(this.amb);
      const n = this.src(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; lp.type = 'lowpass'; lp.frequency.value = 6000;
      const g = c.createGain(); g.gain.value = .16; n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out); n.start();
      this.rainNode = { out };
    }
    this.rainNode.out.gain.setTargetAtTime(level, this.now, .6);
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

  /* ---------- Part 1: night, the motorbike, her ---------- */
  /** night insects: soft, irregular chirps on the ambience bus, 0 stops */
  setInsects(level: number) {
    if (!this.ok) return; const c = this.ctx!;
    if (!this.insects) {
      if (level <= 0) return;
      const out = c.createGain(); out.gain.value = 0; out.connect(this.amb);
      [4300, 5200, 3700].forEach((f, i) => {
        // a chirp is a short burst: square wave → 0..1 on/off envelope (offset, never negative), very quiet
        const o = c.createOscillator(); o.frequency.value = f;
        const am = c.createOscillator(); am.type = 'square'; am.frequency.value = 9 + i * 4;
        const amg = c.createGain(); amg.gain.value = .5; am.connect(amg);
        const g = c.createGain(); g.gain.value = .5; amg.connect(g.gain);            // .5 ± .5 → 0 … 1
        const sw = c.createOscillator(); sw.frequency.value = .11 + i * .05;          // whole choruses swell and fade
        const swg = c.createGain(); swg.gain.value = .5; sw.connect(swg);
        const env = c.createGain(); env.gain.value = .5; swg.connect(env.gain);       // .5 ± .5 → 0 … 1
        const lvl = c.createGain(); lvl.gain.value = .006;                            // insects are faint
        o.connect(g); g.connect(env); env.connect(lvl); this.out(lvl, (i - 1) * .7, .2, out); o.start(); am.start(); sw.start();
      });
      this.insects = { out };
    }
    this.insects.out.gain.setTargetAtTime(level, this.now, .8);
  }
  /** a small motorbike engine, 0 stops */
  setBike(level: number, rpm = .6) {
    if (!this.ok) return; const c = this.ctx!;
    if (!this.bike) {
      if (level <= 0) return;
      const out = c.createGain(); out.gain.value = 0; out.connect(this.amb);
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 48;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 3;
      const n = this.src(), nb = c.createBiquadFilter(), ng = c.createGain(); nb.type = 'bandpass'; nb.frequency.value = 300; ng.gain.value = .2;
      o.connect(lp); n.connect(nb); nb.connect(ng); ng.connect(lp); lp.connect(out); o.start(); n.start();
      this.bike = { out, o, lp };
    }
    this.bike.out.gain.setTargetAtTime(level * .12, this.now, .25);
    this.bike.o.frequency.setTargetAtTime(38 + rpm * 40, this.now, .3); this.bike.lp.frequency.setTargetAtTime(400 + rpm * 900, this.now, .3);
  }
  /** the bike coughs: the engine stumbles a few times */
  bikeSputter() {
    if (!this.bike) return; const b = this.bike, t = this.now;
    [0, .32, .5, .95, 1.2].forEach((dt, i) => {
      b.out.gain.setValueAtTime(i % 2 ? .1 : .015, t + dt);
      b.o.frequency.setValueAtTime(i % 2 ? 62 : 30, t + dt);
    });
    window.setTimeout(() => this.thump(.25, 60), 400);
  }
  /** the bike dies, then silence */
  bikeStop() {
    if (!this.bike) return; const b = this.bike, t = this.now;
    b.o.frequency.setTargetAtTime(18, t, .5); b.out.gain.setTargetAtTime(0, t + .3, .35);
    window.setTimeout(() => this.thump(.18, 50), 900);
  }
  /** sari fabric moving somewhere close */
  fabric(pan = -.3) {
    if (!this.ok) return; const c = this.ctx!, t = this.now;
    const n = this.src(), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = .7;
    n.connect(bp); bp.connect(g); this.env(g, t, [[.25, .05], [.6, .02], [1.1, .045], [1.6, 0]]); this.out(g, pan, .15); n.start(t, Math.random()); n.stop(t + 1.7);
  }
  /** a breath right behind the listener's ear */
  breathClose() {
    if (!this.ok) return; const c = this.ctx!, t = this.now;
    const n = this.src(), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .6;
    n.connect(bp); bp.connect(g); this.env(g, t, [[.5, .06], [1.3, 0], [1.6, 0], [2.3, .045], [3.1, 0]]);
    if (c.createPanner) { const p = c.createPanner(); p.panningModel = 'HRTF'; p.positionX.value = -.2; p.positionZ.value = .35; g.connect(p); p.connect(this.master); }
    else this.out(g, -.3, 0);
    n.start(t, Math.random()); n.stop(t + 3.2);
  }
  /** everything drops away for a moment (the silence before something) */
  hushAll(seconds = 2.5) {
    if (!this.ok) return; const g = this.duckG.gain, t = this.now;
    g.cancelScheduledValues(t); g.setTargetAtTime(.04, t, .08); g.setTargetAtTime(1, t + seconds, 1.2);
  }
  /** the bus engine cuts out at once */
  engineCut() { if (this.engine) { this.engine.out.gain.cancelScheduledValues(this.now); this.engine.out.gain.setTargetAtTime(0, this.now, .03); } this.setBuzz(0); }
  /** the tube lights come back on */
  lightsBack() { this.thump(.3, 140); window.setTimeout(() => this.setBuzz(.5), 120); }
  /** the call connects / ends */
  callConnect() { this.tone([[0, 480], [.16, 620]], .05); }
  callEnd() { this.tone([[0, 620], [.18, 480], [.36, 400]], .05); }
  private tone(seq: [number, number][], v: number) {
    if (!this.ok) return; const c = this.ctx!, t = this.now;
    seq.forEach(([dt, f]) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; o.connect(g); this.env(g, t + dt, [[.01, v], [.13, v], [.15, 0]]); this.out(g, 0, 0); o.start(t + dt); o.stop(t + dt + .16); });
  }
  /** faint line noise while a call is open, 0 stops */
  setLine(level: number) {
    if (!this.ok) return; const c = this.ctx!;
    if (!this.line) {
      if (level <= 0) return;
      const out = c.createGain(); out.gain.value = 0; out.connect(this.dlg);
      const n = this.src(), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = .5; g.gain.value = .012;
      n.connect(bp); bp.connect(g); g.connect(out); n.start(); this.line = { out };
    }
    this.line.out.gain.setTargetAtTime(level, this.now, .2);
  }
  /** something small breaks underfoot (the teaser) */
  crunch() {
    if (!this.ok) return; const c = this.ctx!, t = this.now;
    const n = this.src(), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1.4;
    n.connect(bp); bp.connect(g); this.env(g, t, [[.005, .5], [.05, .1], [.09, .35], [.25, 0]]); this.out(g, 0, .1); n.start(t, Math.random()); n.stop(t + .3);
    this.thump(.3, 90);
  }

  /** an old seat's springs taking a weight that isn't there */
  seatSpring(pan = 0) {
    if (!this.ok) return; const c = this.ctx!, t = this.now;
    [0, .18, .42].forEach((dt, i) => {
      const o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(190 - i * 25, t + dt); o.frequency.exponentialRampToValueAtTime(120 - i * 15, t + dt + .35);
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 6;
      o.connect(bp); bp.connect(g); this.env(g, t + dt, [[.02, .09 - i * .02], [.35, 0]]); this.out(g, pan, .35); o.start(t + dt); o.stop(t + dt + .4);
    });
    this.creak(.3, pan);
  }
  /** a tube light stuttering: the buzz cuts out with a click, twice */
  stutter() {
    if (!this.ok) return;
    [0, 160, 330].forEach((ms, i) => window.setTimeout(() => { this.setBuzz(i % 2 ? .6 : 0); this.thump(.08, 900); }, ms));
    window.setTimeout(() => this.setBuzz(.5), 900);
  }
  /** loose window glass rattling in its frame as the bus hits the road */
  rattle(v = .5, pan = 0) {
    if (!this.ok) return; const c = this.ctx!, t = this.now;
    const n = this.src(), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 3;
    n.connect(bp); bp.connect(g);
    const pts: [number, number][] = []; for (let i = 0; i < 9; i++) { pts.push([i * .045, .1 * v], [i * .045 + .02, 0]); }
    this.env(g, t, pts); this.out(g, pan, .2); n.start(t, Math.random()); n.stop(t + .5);
  }

  /* ---------- Kokila's signature: her bangles, her tune ---------- */
  /** glass bangles (choodi) clinking as she moves; often heard when nothing is seen */
  bangles(v = .5, pan = -.4) {
    if (!this.ok) return; const c = this.ctx!, t0 = this.now;
    const n = 3 + Math.floor(Math.random() * 3);
    let t = t0;
    for (let i = 0; i < n; i++) {
      t += .05 + Math.random() * .16;
      // glass rings at a few inharmonic partials and dies fast
      [2760, 4130, 5390, 7020].forEach((f, j) => {
        const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f * (1 + (Math.random() - .5) * .03);
        const a = v * .05 / (j + 1);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + .18 + Math.random() * .25);
        o.connect(g); this.out(g, pan + (Math.random() - .5) * .3, .45); o.start(t); o.stop(t + .5);
      });
    }
  }
  /** her tune: three or four low hummed notes, a lullaby that isn't one. far = distant and drowned in reverb */
  hum(v = .5, far = false, pan = 0) {
    if (!this.ok) return; const c = this.ctx!, t0 = this.now + .05;
    const notes = [220, 261.63, 246.94, 207.65], len = .95;
    const out = c.createGain(); out.gain.value = v * (far ? .05 : .09);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = far ? 450 : 750;
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 320; f1.Q.value = 3;      // a closed-mouth "mmm"
    out.connect(lp); lp.connect(f1);
    const g2 = c.createGain(); g2.gain.value = 1.6; f1.connect(g2); this.out(g2, pan, far ? .9 : .45);
    const o = c.createOscillator(); o.type = 'sawtooth';
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5.2; vg.gain.value = 2.2; vib.connect(vg); vg.connect(o.frequency);
    const env = c.createGain(); env.gain.value = 0; o.connect(env); env.connect(out);
    notes.forEach((f, i) => {
      const t = t0 + i * len;
      o.frequency.setTargetAtTime(f, t, .06);                   // she slides into each note, a little flat
      env.gain.setTargetAtTime(1, t, .12); env.gain.setTargetAtTime(.35, t + len * .75, .1);
    });
    env.gain.setTargetAtTime(0, t0 + notes.length * len, .4);
    o.start(t0); vib.start(t0); o.stop(t0 + notes.length * len + 2); vib.stop(t0 + notes.length * len + 2);
  }
}

export const audio = new AudioEngine();
