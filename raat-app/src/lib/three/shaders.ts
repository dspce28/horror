// GLSL for the photo surfaces and the lens pass.

export const NOISE = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.), f.x), f.y); }
float fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= .5; } return s; }
`;

/** A photograph pushed into depth by its depth map. */
export const PHOTO_VERT = /* glsl */ `
uniform sampler2D uDepth;
uniform float uDepthScale, uHasDepth;
varying vec2 vUv;
varying float vD;
void main() {
  vUv = uv;
  float d = uHasDepth > .5 ? texture2D(uDepth, uv).r : .3;
  vD = d;
  vec3 p = position;
  p.z += d * uDepthScale;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
}`;

export const PHOTO_FRAG = /* glsl */ `
uniform sampler2D uMap, uDepth;
uniform float uMix, uLight, uWarm, uFog, uTime, uHasMap, uDissolve, uDof, uFade, uDoorOpen, uFill;
uniform vec4 uDoor; // the bus door in image space: x0, y0, x1, y1 (top-left origin)
uniform vec2 uFocus;
uniform vec3 uFogColor;
// living photographs: where the people are in this image (image space, top-left origin)
uniform float uLife;
uniform vec4 uHeadA, uHeadB;   // head ellipses: cx, cy, rx, ry (rx = 0: nobody there)
uniform vec4 uBodyA, uBodyB;   // torso boxes: x0, y0, x1, y1
uniform vec4 uHairA;           // ellipse around loose hair
uniform float uVanish;         // fog swallowing the picture, far things first: 0..1
uniform float uRowsOut;        // lights dying row by row, from the back of the bus (far) to the camera (near): 0..1
varying vec2 vUv;
varying float vD;
${NOISE}
float ell(vec2 p, vec4 e) { return e.z <= 0. ? 0. : 1. - smoothstep(.55, 1., length((p - e.xy) / e.zw)); }
float box(vec2 p, vec4 b) { if (b.z <= b.x) return 0.; vec2 m = min(p - b.xy, b.zw - p); return smoothstep(0., .04, min(m.x, m.y)); }
// small, slow, never in sync: a head that drifts and nods, a chest that breathes, hair that moves in the air
vec2 lifeOffset(vec2 iu, float ph) {
  float t = uTime;
  vec2 d = vec2(0.);
  float br = sin(t * 1.25 + ph);                                   // breath, about 12 a minute
  float hA = ell(iu, uHeadA), hB = ell(iu, uHeadB + vec4(0.));
  d += hA * vec2(sin(t * .53 + ph) * .0042 + sin(t * 1.7) * .0007, sin(t * .41 + ph * 2.) * .0028 + br * .0012);
  d += hB * vec2(sin(t * .47 + ph + 2.) * .0038, sin(t * .37 + 1.3) * .0026 + sin(t * 1.1 + 2.) * .001);
  float bA = box(iu, uBodyA), bB = box(iu, uBodyB);
  d.y += bA * br * .0026 * (1. - (iu.y - uBodyA.y) / max(.01, uBodyA.w - uBodyA.y));
  d.y += bB * sin(t * 1.05 + 1.7) * .0022 * (1. - (iu.y - uBodyB.y) / max(.01, uBodyB.w - uBodyB.y));
  return d;
}
void main() {
  if (uHasMap < .5) discard;
  vec2 uv = vUv;
  if (uLife > 0.) {
    vec2 iu = vec2(vUv.x, 1. - vUv.y);
    vec2 d = lifeOffset(iu, 0.);
    // hair: only the dark strands near the head move, on slow air
    float hm = ell(iu, uHairA);
    if (hm > 0.) {
      float lum = dot(texture2D(uMap, vUv).rgb, vec3(.3, .59, .11));
      hm *= 1. - smoothstep(.12, .3, lum);
      d += hm * (vec2(fbm(iu * vec2(5., 9.) + vec2(uTime * .13, uTime * .31)), fbm(iu * vec2(7., 4.) + uTime * .19)) - .5) * .009;
    }
    uv -= vec2(d.x, -d.y) * uLife;
  }
  // depth of field: blur by distance from the depth at the focus point
  float fd = texture2D(uDepth, uFocus).r;
  float blur = smoothstep(.2, .6, abs(vD - fd)) * uDof;
  vec3 c = texture2D(uMap, uv, blur).rgb;
  if (uVanish > 0.) {
    // the fog thickens and takes the picture from the far end toward the camera; what is near goes last
    float fogN = fbm(vUv * vec2(4., 6.) + vec2(uTime * .05, uTime * .02));
    float front = uVanish * 1.35 - (1. - vD) * .35;
    float take = smoothstep(.0, .55, front + (fogN - .5) * .25);
    c = mix(c, uFogColor * (1.05 + fogN * .6), clamp(take, 0., 1.));
  }
  if (uRowsOut > 0.) {
    // five rows of tube lights; each row goes out with a stutter as the front reaches its depth
    float rows = floor(uRowsOut * 5.99) / 5.;
    float edge = rows * 1.05;
    float out_ = 1. - smoothstep(edge - .04, edge + .02, vD);
    float stutter = step(.5, fract(uTime * 13.)) * step(fract(uRowsOut * 5.99), .25);
    c *= mix(1., .12 + .25 * stutter, out_);
  }
  // drifting fog that lives in the far parts of the picture
  float far = pow(1. - vD, 1.4);
  float f = fbm(vUv * vec2(3., 5.) + vec2(uTime * .025, uTime * .006));
  c = mix(c, uFogColor, clamp(far * uFog * (.15 + f * .55), 0., .5));
  // the bus door folds open: warm cabin light inside its frame, spilling down onto the wet road
  if (uDoorOpen > 0.) {
    vec2 iu = vec2(vUv.x, 1. - vUv.y);
    vec2 dc = vec2((uDoor.x + uDoor.z) * .5, (uDoor.y + uDoor.w) * .5), dh = vec2((uDoor.z - uDoor.x) * .5, (uDoor.w - uDoor.y) * .5);
    float inside = step(abs(iu.x - dc.x), dh.x * uDoorOpen) * step(abs(iu.y - dc.y), dh.y);
    float hum = .93 + .07 * sin(uTime * 37.) * step(.97, fract(uTime * .31));
    vec3 warm = vec3(1., .74, .42) * (.62 + .38 * smoothstep(uDoor.w, uDoor.y, iu.y)) * hum;
    // light through the doorway: the photo's own detail stays, lit warm from inside, brightest at the top step
    vec3 lit = c * vec3(2.3, 1.7, 1.05) + warm * (.12 + .22 * smoothstep(uDoor.w, uDoor.y, iu.y));
    c = mix(c, lit, inside);
    float spill = exp(-pow((iu.x - dc.x) / (dh.x * 2.4), 2.)) * step(uDoor.w, iu.y) * (1. - smoothstep(uDoor.w, uDoor.w + .3, iu.y));
    c += vec3(1., .7, .38) * spill * uDoorOpen * .45;
  }
  c *= uLight;
  c = mix(c, c * vec3(1.08, .97, .82), uWarm);
  // the doorway's light fills the frame: the cut to the interior hides inside it
  c = mix(c, vec3(.86, .66, .42) * (.8 + .35 * (1. - length(vUv - .5))), uFill * .82); // the doorway fills the frame with warm cabin light, not white
  float a = 1.;
  if (uDissolve > .5) {
    float n = noise(vUv * 9. + uTime * .3);
    a = smoothstep(n - .12, n + .12, uMix * 1.24 - .12);
    float edge = (1. - abs(a * 2. - 1.)) * step(.02, uMix) * step(uMix, .98);
    c += vec3(.9, .25, .15) * edge * .3;
  }
  gl_FragColor = vec4(c, a * uFade);
}`;

/** Full-screen lens: barrel bend and RGB split with scroll speed, glitch bands, scanlines, grain, vignette. */
export const LENS_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

export const LENS_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uRes;
uniform float uTime, uSpeed, uGlitch, uReduced;
varying vec2 vUv;
${NOISE}
void main() {
  vec2 uv = vUv, d = uv - .5;
  float k = .05 + uSpeed * .15 + uGlitch * .12;
  uv = .5 + d * (1. - k * .5 + k * dot(d, d) * 2.);
  float band = floor(uv.y * 42. + floor(uTime * 24.));
  float g = step(1. - uGlitch * .55, hash(vec2(band, floor(uTime * 30.))));
  uv.x += g * (hash(vec2(band, 7.)) - .5) * .12 * uGlitch;
  uv.x += (noise(vec2(uv.y * 8., uTime * 2.)) - .5) * .002 * (1. - uReduced);
  vec2 split = (uv - .5) * 2. * (uSpeed * 11. + uGlitch * 18. + 1.2) / uRes;
  vec3 c = vec3(texture2D(tScene, uv + split).r, texture2D(tScene, uv).g, texture2D(tScene, uv - split).b);
  c *= 1. - .05 * (.5 + .5 * sin(vUv.y * uRes.y * 1.6)) * (1. - uReduced * .7);
  c += (hash(vUv * uRes + fract(uTime) * 91.) - .5) * .07;
  c *= smoothstep(1.05, .35, length(d * vec2(1.1, 1.25)));
  if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) c = vec3(0.);
  gl_FragColor = vec4(c, 1.);
}`;

/** A photograph rebuilt as the 3D space it shows: each pixel pushed out along its camera ray by its depth. */
export const RELIEF_VERT = /* glsl */ `
uniform sampler2D uDepth;
uniform vec2 uTan;
uniform float uNear, uFar;
varying vec2 vUv;
varying float vDist;
void main() {
  vUv = uv;
  float d = texture2D(uDepth, uv).r;
  float dist = 1. / (d * (1. / uNear - 1. / uFar) + 1. / uFar);
  vDist = dist;
  vec3 p = vec3((uv.x - .5) * 2. * uTan.x * dist, (uv.y - .5) * 2. * uTan.y * dist, -dist);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
}`;

export const RELIEF_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uLight, uHas, uEdge;
varying vec2 vUv;
varying float vDist;
void main() {
  if (uHas < .5) discard;
  vec3 c = texture2D(uMap, vUv).rgb * uLight;
  // stretched 'rubber' between near and far objects: darken it so it reads as shadow
  float stretch = fwidth(vDist) / max(.05, fwidth(vUv.x) * 40.);
  c *= 1. - smoothstep(.6, 2.5, stretch) * uEdge;
  c = mix(c, vec3(.02, .022, .028), smoothstep(7., 16., vDist) * .55);
  gl_FragColor = vec4(c, 1.);
}`;
