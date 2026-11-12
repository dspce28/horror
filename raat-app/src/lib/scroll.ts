'use client';
// A tiny handle so components outside the scroll controller can pause, resume and jump the story.
export const scroll = {
  lock: (_on: boolean) => {},
  toProgress: (_p: number, _immediate?: boolean) => {},
};
