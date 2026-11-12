'use client';
// One full-screen WebGL quad that draws the current photograph through a lens:
// barrel warp and RGB split that grow with scroll speed, glitch cuts between shots,
// scanlines, grain, flicker and a burn-in dissolve. Falls back to <img> if WebGL is missing.

const VERT = `#version 300 es
in vec2 p; out vec2 vUv;
void main() { vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uA, uB;          // current and previous shot
uniform vec4 uRectA, uRectB;       // image placement in screen px: x, y, w, h
uniform vec2 uRes;
uniform float uMix, uTime, uSpeed, uGlitch, uLight, uWarm, uLens, uHasA, uHasB, uReduced;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.), f.x), f.y); }

vec3 shot(sampler2D t, vec4 r, vec2 uv, float split) {
  vec2 px = vec2(uv.x, 1. - uv.y) * uRes;           // top-left origin
  vec2 iu = (px - r.xy) / r.zw;
  vec2 dir = (uv - .5) * 2. * split / r.zw;
  float cr = texture(t, iu + dir).r;
  float cg = texture(t, iu).g;
  float cb = texture(t, iu - dir).b;
  return vec3(cr, cg, cb);
}

void main() {
  vec2 uv = vUv;
  // lens: a constant hint of curvature, bending hard while scrolling fast
  vec2 d = uv - .5;
  float k = uLens * .05 + uSpeed * .15 + uGlitch * .12;
  uv = .5 + d * (1. - k * .5 + k * dot(d, d) * 2.);
  // glitch: horizontal bands jump sideways
  float band = floor(uv.y * 42. + floor(uTime * 24.));
  float g = step(1. - uGlitch * .55, hash(vec2(band, floor(uTime * 30.))));
  uv.x += g * (hash(vec2(band, 7.)) - .5) * .12 * uGlitch;
  // tiny analogue wobble
  uv.x += (noise(vec2(uv.y * 8., uTime * 2.)) - .5) * .002 * (1. - uReduced);

  float split = uSpeed * 11. + uGlitch * 18. + 1.2;  // pixels
  vec3 a = uHasA > .5 ? shot(uA, uRectA, uv, split) : vec3(0.);
  vec3 b = uHasB > .5 ? shot(uB, uRectB, uv, split) : vec3(0.);
  // cuts dissolve through noise rather than a plain fade
  float n = noise(uv * 9. + uTime * .3);
  float m = smoothstep(n - .12, n + .12, uMix * 1.24 - .12);
  vec3 c = mix(b, a, m);
  float edge = (1. - abs(m * 2. - 1.)) * step(.02, uMix) * step(uMix, .98);
  c += vec3(.9, .25, .15) * edge * .25;

  c *= uLight;
  c = mix(c, c * vec3(1.08, .98, .85), uWarm);
  // scanlines and grain
  c *= 1. - .05 * (.5 + .5 * sin((vUv.y * uRes.y) * 1.6)) * (1. - uReduced * .7);
  c += (hash(vUv * uRes + fract(uTime) * 91.) - .5) * .07;
  // vignette that follows the lens
  c *= smoothstep(1.05, .35, length(d * vec2(1.1, 1.25)));
  // outside the warped frame: black
  if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) c = vec3(0.);
  o = vec4(c, 1.);
}`;

export interface StageInput {
  a: string | null; b: string | null; mix: number;
  rectA: [number, number, number, number]; rectB: [number, number, number, number];
  speed: number; glitch: number; light: number; warm: number; lens: number; reduced: boolean; time: number;
}

export class GLStage {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private tex = new Map<string, WebGLTexture | null>();
  private blank: WebGLTexture;

  static create(canvas: HTMLCanvasElement): GLStage | null {
    try {
      const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
      return gl ? new GLStage(gl) : null;
    } catch { return null; }
  }

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader'); return s; };
    const p = gl.createProgram()!; gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    this.prog = p; gl.useProgram(p);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uA', 'uB', 'uRectA', 'uRectB', 'uRes', 'uMix', 'uTime', 'uSpeed', 'uGlitch', 'uLight', 'uWarm', 'uLens', 'uHasA', 'uHasB', 'uReduced'].forEach((n) => { this.u[n] = gl.getUniformLocation(p, n); });
    gl.uniform1i(this.u.uA, 0); gl.uniform1i(this.u.uB, 1);
    this.blank = this.makeTex(null);
  }

  private makeTex(img: HTMLImageElement | null): WebGLTexture {
    const gl = this.gl, t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /** returns the texture once its image has loaded; starts loading on first ask */
  private get(url: string | null): WebGLTexture | null {
    if (!url) return null;
    if (this.tex.has(url)) return this.tex.get(url) ?? null;
    this.tex.set(url, null);
    const img = new Image(); img.decoding = 'async';
    img.onload = () => { this.tex.set(url, this.makeTex(img)); };
    img.src = url;
    return null;
  }

  preload(url: string) { this.get(url); }

  draw(i: StageInput, w: number, h: number) {
    const gl = this.gl, cv = gl.canvas as HTMLCanvasElement;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    gl.viewport(0, 0, w, h);
    const ta = this.get(i.a), tb = this.get(i.b);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ta ?? this.blank);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tb ?? this.blank);
    const u = this.u;
    gl.uniform4f(u.uRectA, ...i.rectA); gl.uniform4f(u.uRectB, ...i.rectB);
    gl.uniform2f(u.uRes, w, h);
    gl.uniform1f(u.uMix, i.mix); gl.uniform1f(u.uTime, i.time); gl.uniform1f(u.uSpeed, i.speed); gl.uniform1f(u.uGlitch, i.glitch);
    gl.uniform1f(u.uLight, i.light); gl.uniform1f(u.uWarm, i.warm); gl.uniform1f(u.uLens, i.lens);
    gl.uniform1f(u.uHasA, ta ? 1 : 0); gl.uniform1f(u.uHasB, tb ? 1 : 0); gl.uniform1f(u.uReduced, i.reduced ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    const gl = this.gl;
    this.tex.forEach((t) => { if (t) gl.deleteTexture(t); }); gl.deleteTexture(this.blank); gl.deleteProgram(this.prog);
  }
}
