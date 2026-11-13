// Where the people are in each photograph, so the photo shader can make them breathe, shift and let their
// hair move. Image space, top-left origin. Heads and hair are ellipses (cx, cy, rx, ry); bodies are boxes
// (x0, y0, x1, y1). Amplitudes are tiny on purpose: life, not animation.

type V4 = [number, number, number, number];
export interface Life { headA?: V4; headB?: V4; bodyA?: V4; bodyB?: V4; hair?: V4; amp?: number }

const NONE: V4 = [0, 0, 0, 0];

export const LIFE: Record<string, Life> = {
  // Kokila (left) and Ramesh (right) in the lit bus
  twist: { headA: [.32, .21, .075, .15], bodyA: [.04, .33, .5, .9], headB: [.73, .36, .075, .15], bodyB: [.55, .5, .96, .96], hair: [.3, .38, .2, .36] },
  'driver-turn': { headA: [.5, .32, .13, .28], bodyA: [.45, .5, .97, 1], amp: .8 },
  'driver-back': { headA: [.74, .33, .07, .14], bodyA: [.6, .45, .96, 1] },
  'her-look': { headA: [.47, .28, .05, .1], bodyA: [.38, .36, .6, .95], hair: [.47, .42, .12, .34] },
  'her-lunge': { headA: [.53, .28, .1, .2], bodyA: [.3, .45, .75, 1], hair: [.46, .45, .34, .5], amp: .9 },
  'her-behind': { headA: [.53, .31, .05, .1], bodyA: [.44, .38, .62, .9], hair: [.53, .42, .08, .2] },
  'her-hair': { headA: [.5, .37, .05, .1], bodyA: [.42, .46, .58, .95], hair: [.5, .45, .07, .2] },
  'her-face': { headA: [.5, .4, .2, .38], hair: [.5, .45, .45, .55], amp: .6 },
};

export function lifeFor(name: string | null): Required<Omit<Life, 'amp'>> & { amp: number } {
  const l = (name && LIFE[name]) || null;
  return { headA: l?.headA ?? NONE, headB: l?.headB ?? NONE, bodyA: l?.bodyA ?? NONE, bodyB: l?.bodyB ?? NONE, hair: l?.hair ?? NONE, amp: l ? (l.amp ?? 1) : 0 };
}
